import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({ connectionString: process.env.DB_URL });
const PORT = process.env.PORT || 8080;

const PRIORITIES = ['EMERGENCY', 'BIOMETRIC', 'GEOFENCE', 'TASK', 'CALENDAR'];

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const derivePriority = (event) => {
  if (event.type === 'panic' || event.source === 'panic') return 'EMERGENCY';
  if (event.source === 'biometric') return 'BIOMETRIC';
  if (event.source === 'mobile' || event.type?.startsWith('geo_')) return 'GEOFENCE';
  if (event.source === 'task') return 'TASK';
  if (event.source === 'calendar') return 'CALENDAR';
  return 'TASK';
};

const applyRules = (event, current, shiftActive) => {
  const candidate = {
    status: current?.status || 'OFF_SHIFT',
    reason: 'Sin cambios',
    priority: derivePriority(event)
  };

  if (event.type === 'panic') {
    candidate.status = 'EMERGENCY';
    candidate.reason = 'Botón de pánico';
    candidate.priority = 'EMERGENCY';
    return candidate;
  }

  if (event.source === 'biometric' && event.type === 'entry') {
    candidate.status = 'ON_SHIFT';
    candidate.reason = 'Entrada biométrica';
    candidate.priority = 'BIOMETRIC';
    return candidate;
  }

  if (event.source === 'biometric' && event.type === 'exit') {
    candidate.status = 'OFF_SHIFT';
    candidate.reason = 'Salida biométrica';
    candidate.priority = 'BIOMETRIC';
    return candidate;
  }

  if (event.source === 'task' && event.type === 'assigned') {
    candidate.status = 'BUSY';
    candidate.reason = 'Tarea asignada';
    candidate.priority = 'TASK';
    return candidate;
  }

  if (event.source === 'task' && event.type === 'completed') {
    candidate.status = 'AVAILABLE';
    candidate.reason = 'Tarea completada';
    candidate.priority = 'TASK';
    return candidate;
  }

  if (event.source === 'mobile' && event.type === 'geo_enter' && shiftActive) {
    candidate.status = 'AVAILABLE';
    candidate.reason = 'Entrada a geocerca durante turno';
    candidate.priority = 'GEOFENCE';
    return candidate;
  }

  if (event.type === 'geo_exit') {
    candidate.status = 'BREAK';
    candidate.reason = 'Salida de geocerca';
    candidate.priority = 'GEOFENCE';
    return candidate;
  }

  if (!shiftActive) {
    candidate.status = 'OFF_SHIFT';
    candidate.reason = 'Fuera de turno';
  }

  return candidate;
};

const priorityIndex = (priority) => {
  const idx = PRIORITIES.indexOf(priority);
  return idx === -1 ? PRIORITIES.length : idx;
};

const chooseByPriority = (candidate, current, eventTs) => {
  if (!current) return candidate;
  const currentPriority = priorityIndex(current.source || current.priority || 'TASK');
  const candidatePriority = priorityIndex(candidate.priority);
  if (candidatePriority < currentPriority) return candidate;
  if (candidatePriority === currentPriority) {
    if (!current.ts || new Date(eventTs) >= new Date(current.ts)) {
      return candidate;
    }
  }
  return { ...current, priority: current.source };
};

const getCurrentSnapshot = async (personId) => {
  const { rows } = await pool.query(
    'SELECT person_id, status, ts, source, reason FROM status_snapshot WHERE person_id=$1 ORDER BY ts DESC LIMIT 1',
    [personId]
  );
  return rows[0];
};

const isShiftActive = async (personId, ts) => {
  const { rows } = await pool.query(
    `SELECT 1 FROM shift WHERE person_id=$1 AND start_ts <= $2 AND (end_ts IS NULL OR end_ts >= $2 - INTERVAL '10 minutes') LIMIT 1`,
    [personId, ts]
  );
  return Boolean(rows[0]);
};

app.post('/auth/login', (req, res) => {
  const { username } = req.body || {};
  const token = Buffer.from(`${username || 'operador'}:${Date.now()}`).toString('base64');
  res.json({ token });
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/people', asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];
  if (req.query.unit) {
    values.push(req.query.unit);
    filters.push(`unit = $${values.length}`);
  }
  if (req.query.role) {
    values.push(req.query.role);
    filters.push(`role = $${values.length}`);
  }
  let sql = 'SELECT id, name, role, hierarchy, specialty, unit FROM person';
  if (filters.length) {
    sql += ' WHERE ' + filters.join(' AND ');
  }
  sql += ' ORDER BY name';
  const { rows } = await pool.query(sql, values);
  res.json(rows);
}));

app.post('/people', asyncHandler(async (req, res) => {
  const { name, role, hierarchy, specialty, unit } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO person (name, role, hierarchy, specialty, unit) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, role, hierarchy || null, specialty || null, unit || null]
  );
  res.status(201).json(rows[0]);
}));

app.post('/events/presence', asyncHandler(async (req, res) => {
  try {
    const event = req.body;
    if (!event.id) event.id = uuidv4();
    if (!event.person_id || !event.ts || !event.source || !event.type) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }
    const eventTs = new Date(event.ts);
    await pool.query(
      'INSERT INTO presence_event (id, person_id, ts, source, type, payload) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
      [event.id, event.person_id, eventTs, event.source, event.type, event.payload || {}]
    );
    const current = await getCurrentSnapshot(event.person_id);
    const shiftActive = await isShiftActive(event.person_id, eventTs);
    const candidate = applyRules(event, current, shiftActive);
    const winner = chooseByPriority(candidate, current, eventTs);
    const snapshotTs = eventTs.toISOString();
    const reason = candidate === winner ? candidate.reason : winner.reason || 'Sin cambios';
    const source = candidate === winner ? candidate.priority : winner.source || winner.priority || 'TASK';
    const { rows } = await pool.query(
      'INSERT INTO status_snapshot (person_id, status, ts, source, reason) VALUES ($1,$2,$3,$4,$5) RETURNING person_id, status, ts, source, reason',
      [event.person_id, winner.status || candidate.status, snapshotTs, source, reason]
    );
    res.status(202).json({ status: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

app.get('/status/now', asyncHandler(async (req, res) => {
  const values = [];
  let sql = `SELECT DISTINCT ON (s.person_id) s.person_id, s.status, s.ts, s.source, s.reason
    FROM status_snapshot s
    JOIN person p ON p.id = s.person_id`;
  if (req.query.unit) {
    values.push(req.query.unit);
    sql += ` WHERE p.unit = $${values.length}`;
  }
  sql += ' ORDER BY s.person_id, s.ts DESC';
  const { rows } = await pool.query(sql, values);
  res.json(rows);
}));

app.get('/status/history', asyncHandler(async (req, res) => {
  const { person_id, from, to } = req.query;
  if (!person_id) {
    return res.status(400).json({ error: 'person_id is required' });
  }
  const values = [person_id];
  let sql = 'SELECT person_id, status, ts, source, reason FROM status_snapshot WHERE person_id = $1';
  if (from) {
    values.push(from);
    sql += ` AND ts >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` AND ts <= $${values.length}`;
  }
  sql += ' ORDER BY ts DESC';
  const { rows } = await pool.query(sql, values);
  res.json(rows);
}));

app.post('/alerts/test', (_req, res) => {
  res.json({ ok: true, sent_at: new Date().toISOString() });
});

app.get('/reports/kpi', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  res.json({
    from,
    to,
    absenteeism: 0.05,
    utilization: 0.72,
    sla: 0.93,
    coverage: 0.88
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend Node listening on port ${PORT}`);
  });
}

export { app, applyRules, chooseByPriority, PRIORITIES };
