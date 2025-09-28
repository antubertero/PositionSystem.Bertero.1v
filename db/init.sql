CREATE TABLE IF NOT EXISTS site (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  zones JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS person (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  hierarchy TEXT,
  specialty TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES person(id),
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ,
  site_id INTEGER REFERENCES site(id)
);

CREATE TABLE IF NOT EXISTS presence_event (
  id UUID PRIMARY KEY,
  person_id INTEGER REFERENCES person(id),
  ts TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_presence_event_person_ts ON presence_event(person_id, ts DESC);

CREATE TABLE IF NOT EXISTS status_snapshot (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES person(id),
  status TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_snapshot_person_ts ON status_snapshot(person_id, ts DESC);

