package main

import (
"context"
"log"
"net/http"
"os"
"time"

"backend-go/internal/handlers"
"backend-go/internal/state"

"github.com/gin-gonic/gin"
"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
connStr := os.Getenv("DB_URL")
if connStr == "" {
log.Fatal("DB_URL is required")
}
ctx := context.Background()
pool, err := pgxpool.New(ctx, connStr)
if err != nil {
log.Fatalf("failed to connect postgres: %v", err)
}
r := gin.Default()

svc := handlers.NewService(pool, state.ApplyRules, state.ChooseByPriority)
handlers.RegisterRoutes(r, svc)

port := os.Getenv("PORT")
if port == "" {
port = "8081"
}
s := &http.Server{
Addr:           ":" + port,
Handler:        r,
ReadTimeout:    10 * time.Second,
WriteTimeout:   10 * time.Second,
MaxHeaderBytes: 1 << 20,
}

log.Printf("Backend Go listening on %s", port)
if err := s.ListenAndServe(); err != nil {
log.Fatalf("server error: %v", err)
}
}
