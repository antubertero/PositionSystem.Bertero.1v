package handlers

import (
"context"
"fmt"
"net/http"
"strconv"
"strings"
"time"

"backend-go/internal/state"

"github.com/gin-gonic/gin"
"github.com/jackc/pgx/v5"
"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
pool             *pgxpool.Pool
applyRules       func(state.Event, *state.Snapshot, bool) state.Candidate
chooseByPriority func(state.Candidate, *state.Snapshot, time.Time) state.Candidate
}

func NewService(pool *pgxpool.Pool, apply func(state.Event, *state.Snapshot, bool) state.Candidate, choose func(state.Candidate, *state.Snapshot, time.Time) state.Candidate) *Service {
return &Service{pool: pool, applyRules: apply, chooseByPriority: choose}
}

func RegisterRoutes(r *gin.Engine, svc *Service) {
r.POST("/auth/login", svc.login)
r.GET("/health", svc.health)
r.GET("/people", svc.listPeople)
r.POST("/people", svc.createPerson)
r.POST("/events/presence", svc.ingestEvent)
r.GET("/status/now", svc.statusNow)
r.GET("/status/history", svc.statusHistory)
r.POST("/alerts/test", svc.alertTest)
r.GET("/reports/kpi", svc.reportsKPI)
}

func (s *Service) login(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"token": "dummy"})
}

func (s *Service) health(c *gin.Context) {
if err := s.pool.Ping(context.Background()); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Service) listPeople(c *gin.Context) {
filters := []string{}
args := []interface{}{}
if unit := c.Query("unit"); unit != "" {
filters = append(filters, fmt.Sprintf("unit = $%d", len(args)+1))
args = append(args, unit)
}
if role := c.Query("role"); role != "" {
filters = append(filters, fmt.Sprintf("role = $%d", len(args)+1))
args = append(args, role)
}
query := "SELECT id, name, role, hierarchy, specialty, unit FROM person"
if len(filters) > 0 {
query += " WHERE " + strings.Join(filters, " AND ")
}
query += " ORDER BY name"
rows, err := s.pool.Query(context.Background(), query, args...)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
defer rows.Close()
var people []gin.H
for rows.Next() {
var (
id        int
name      string
role      string
hierarchy *string
specialty *string
unit      *string
)
if err := rows.Scan(&id, &name, &role, &hierarchy, &specialty, &unit); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
people = append(people, gin.H{
"id":        id,
"name":      name,
"role":      role,
"hierarchy": hierarchy,
"specialty": specialty,
"unit":      unit,
})
}
c.JSON(http.StatusOK, people)
}

func (s *Service) createPerson(c *gin.Context) {
var payload struct {
Name      string `json:"name"`
Role      string `json:"role"`
Hierarchy string `json:"hierarchy"`
Specialty string `json:"specialty"`
Unit      string `json:"unit"`
}
if err := c.ShouldBindJSON(&payload); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
if payload.Name == "" || payload.Role == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "name and role are required"})
return
}
row := s.pool.QueryRow(context.Background(),
"INSERT INTO person (name, role, hierarchy, specialty, unit) VALUES ($1,$2,$3,$4,$5) RETURNING id",
payload.Name, payload.Role, nullIfEmpty(payload.Hierarchy), nullIfEmpty(payload.Specialty), nullIfEmpty(payload.Unit),
)
var id int
if err := row.Scan(&id); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (s *Service) ingestEvent(c *gin.Context) {
var event struct {
ID       string                 `json:"id"`
PersonID int                    `json:"person_id"`
TS       time.Time              `json:"ts"`
Source   string                 `json:"source"`
Type     string                 `json:"type"`
Payload  map[string]interface{} `json:"payload"`
}
if err := c.ShouldBindJSON(&event); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
if event.ID == "" {
event.ID = generateUUID()
}
if _, err := s.pool.Exec(context.Background(),
"INSERT INTO presence_event (id, person_id, ts, source, type, payload) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
event.ID, event.PersonID, event.TS, event.Source, event.Type, event.Payload,
); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
current, err := s.fetchSnapshot(event.PersonID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
shiftActive, err := s.isShiftActive(event.PersonID, event.TS)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
candidate := s.applyRules(state.Event{Type: event.Type, Source: event.Source, PersonID: event.PersonID, TS: event.TS}, current, shiftActive)
winner := candidate
if current != nil {
winner = s.chooseByPriority(candidate, current, event.TS)
}
row := s.pool.QueryRow(context.Background(),
"INSERT INTO status_snapshot (person_id, status, ts, source, reason) VALUES ($1,$2,$3,$4,$5) RETURNING person_id, status, ts, source, reason",
event.PersonID, winner.Status, event.TS, winner.Priority, winner.Reason,
)
var snapshot state.Snapshot
if err := row.Scan(&snapshot.PersonID, &snapshot.Status, &snapshot.TS, &snapshot.Source, &snapshot.Reason); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusAccepted, gin.H{"status": snapshot})
}

func (s *Service) statusNow(c *gin.Context) {
args := []interface{}{}
query := `SELECT DISTINCT ON (s.person_id) s.person_id, s.status, s.ts, s.source, s.reason
FROM status_snapshot s
JOIN person p ON p.id = s.person_id`
if unit := c.Query("unit"); unit != "" {
query += fmt.Sprintf(" WHERE p.unit = $%d", len(args)+1)
args = append(args, unit)
}
query += " ORDER BY s.person_id, s.ts DESC"
rows, err := s.pool.Query(context.Background(), query, args...)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
defer rows.Close()
var snapshots []state.Snapshot
for rows.Next() {
var snap state.Snapshot
if err := rows.Scan(&snap.PersonID, &snap.Status, &snap.TS, &snap.Source, &snap.Reason); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
snapshots = append(snapshots, snap)
}
c.JSON(http.StatusOK, snapshots)
}

func (s *Service) statusHistory(c *gin.Context) {
personIDParam := c.Query("person_id")
if personIDParam == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "person_id is required"})
return
}
personID, err := strconv.Atoi(personIDParam)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "person_id must be numeric"})
return
}
args := []interface{}{personID}
query := "SELECT person_id, status, ts, source, reason FROM status_snapshot WHERE person_id = $1"
if from := c.Query("from"); from != "" {
query += fmt.Sprintf(" AND ts >= $%d", len(args)+1)
args = append(args, from)
}
if to := c.Query("to"); to != "" {
query += fmt.Sprintf(" AND ts <= $%d", len(args)+1)
args = append(args, to)
}
query += " ORDER BY ts DESC"
rows, err := s.pool.Query(context.Background(), query, args...)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
defer rows.Close()
var snapshots []state.Snapshot
for rows.Next() {
var snap state.Snapshot
if err := rows.Scan(&snap.PersonID, &snap.Status, &snap.TS, &snap.Source, &snap.Reason); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
snapshots = append(snapshots, snap)
}
c.JSON(http.StatusOK, snapshots)
}

func (s *Service) alertTest(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"ok": true, "sent_at": time.Now().UTC()})
}

func (s *Service) reportsKPI(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{
"absenteeism": 0.05,
"utilization": 0.72,
"sla":         0.93,
"coverage":    0.88,
})
}

func (s *Service) fetchSnapshot(personID int) (*state.Snapshot, error) {
row := s.pool.QueryRow(context.Background(),
"SELECT person_id, status, ts, source, reason FROM status_snapshot WHERE person_id = $1 ORDER BY ts DESC LIMIT 1",
personID,
)
var snapshot state.Snapshot
err := row.Scan(&snapshot.PersonID, &snapshot.Status, &snapshot.TS, &snapshot.Source, &snapshot.Reason)
if err != nil {
if err == pgx.ErrNoRows {
return nil, nil
}
return nil, err
}
return &snapshot, nil
}

func (s *Service) isShiftActive(personID int, ts time.Time) (bool, error) {
row := s.pool.QueryRow(context.Background(),
`SELECT 1 FROM shift WHERE person_id=$1 AND start_ts <= $2 AND (end_ts IS NULL OR end_ts >= $2 - INTERVAL '10 minutes') LIMIT 1`,
personID, ts,
)
var dummy int
if err := row.Scan(&dummy); err != nil {
if err == pgx.ErrNoRows {
return false, nil
}
return false, err
}
return true, nil
}

func generateUUID() string {
return fmt.Sprintf("event-%d", time.Now().UnixNano())
}

func nullIfEmpty(value string) interface{} {
if value == "" {
return nil
}
return value
}
