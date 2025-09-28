package test

import (
"testing"
"time"

"backend-go/internal/state"
)

func TestEmergencyWins(t *testing.T) {
event := state.Event{Type: "panic", Source: "mobile", TS: time.Now()}
candidate := state.ApplyRules(event, nil, true)
if candidate.Status != "EMERGENCY" {
t.Fatalf("expected EMERGENCY, got %s", candidate.Status)
}
}

func TestPriorityOrder(t *testing.T) {
event := state.Event{Type: "assigned", Source: "task", TS: time.Now()}
current := &state.Snapshot{Status: "AVAILABLE", Source: "GEOFENCE", TS: time.Now().Add(-time.Minute)}
candidate := state.ApplyRules(event, current, true)
winner := state.ChooseByPriority(candidate, current, time.Now())
if winner.Status != "AVAILABLE" {
t.Fatalf("expected existing status to win due to higher priority")
}
}
