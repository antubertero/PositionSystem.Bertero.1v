package state

import (
"time"
)

type Event struct {
Type     string                 `json:"type"`
Source   string                 `json:"source"`
PersonID int                    `json:"person_id"`
TS       time.Time              `json:"ts"`
Payload  map[string]interface{} `json:"payload"`
}

type Snapshot struct {
PersonID int       `json:"person_id"`
Status   string    `json:"status"`
TS       time.Time `json:"ts"`
Source   string    `json:"source"`
Reason   string    `json:"reason"`
}

var priorities = []string{"EMERGENCY", "BIOMETRIC", "GEOFENCE", "TASK", "CALENDAR"}

func derivePriority(e Event) string {
switch {
case e.Type == "panic" || e.Source == "panic":
return "EMERGENCY"
case e.Source == "biometric":
return "BIOMETRIC"
case e.Source == "mobile" || hasPrefix(e.Type, "geo_"):
return "GEOFENCE"
case e.Source == "task":
return "TASK"
case e.Source == "calendar":
return "CALENDAR"
default:
return "TASK"
}
}

func hasPrefix(value, prefix string) bool {
if len(value) < len(prefix) {
return false
}
return value[:len(prefix)] == prefix
}

type RuleFunc func(Event, *Snapshot, bool) Candidate

type Candidate struct {
Status   string
Reason   string
Priority string
}

func ApplyRules(e Event, current *Snapshot, shiftActive bool) Candidate {
candidate := Candidate{
Status:   "OFF_SHIFT",
Reason:   "Sin cambios",
Priority: derivePriority(e),
}
if current != nil {
candidate.Status = current.Status
}

switch {
case e.Type == "panic":
candidate.Status = "EMERGENCY"
candidate.Priority = "EMERGENCY"
candidate.Reason = "Botón de pánico"
case e.Source == "biometric" && e.Type == "entry":
candidate.Status = "ON_SHIFT"
candidate.Priority = "BIOMETRIC"
candidate.Reason = "Entrada biométrica"
case e.Source == "biometric" && e.Type == "exit":
candidate.Status = "OFF_SHIFT"
candidate.Priority = "BIOMETRIC"
candidate.Reason = "Salida biométrica"
case e.Source == "task" && e.Type == "assigned":
candidate.Status = "BUSY"
candidate.Priority = "TASK"
candidate.Reason = "Tarea asignada"
case e.Source == "task" && e.Type == "completed":
candidate.Status = "AVAILABLE"
candidate.Priority = "TASK"
candidate.Reason = "Tarea completada"
case e.Source == "mobile" && e.Type == "geo_enter" && shiftActive:
candidate.Status = "AVAILABLE"
candidate.Priority = "GEOFENCE"
candidate.Reason = "Entrada a geocerca"
case e.Type == "geo_exit":
candidate.Status = "BREAK"
candidate.Priority = "GEOFENCE"
candidate.Reason = "Salida de geocerca"
case !shiftActive:
candidate.Status = "OFF_SHIFT"
candidate.Reason = "Fuera de turno"
}

return candidate
}

func priorityIndex(value string) int {
for idx, p := range priorities {
if p == value {
return idx
}
}
return len(priorities)
}

func ChooseByPriority(candidate Candidate, current *Snapshot, eventTS time.Time) Candidate {
if current == nil {
return candidate
}
currentPriority := priorityIndex(current.Source)
candidatePriority := priorityIndex(candidate.Priority)
if candidatePriority < currentPriority {
return candidate
}
if candidatePriority == currentPriority {
if eventTS.After(current.TS) || eventTS.Equal(current.TS) {
return candidate
}
}
return Candidate{Status: current.Status, Priority: current.Source, Reason: current.Reason}
}

func Priorities() []string {
return priorities
}
