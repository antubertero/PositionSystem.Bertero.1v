INSERT INTO site (name, type, zones) VALUES
  ('Hospital Central', 'hospital', '[{"name":"Urgencias"}]')
ON CONFLICT DO NOTHING;

INSERT INTO person (name, role, hierarchy, specialty, unit)
VALUES ('Demo Operador', 'Operador', 'Junior', 'Admisión', 'Urgencias')
ON CONFLICT DO NOTHING;

INSERT INTO shift (person_id, start_ts, end_ts, site_id)
SELECT p.id, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 hour', s.id
FROM person p CROSS JOIN site s
WHERE p.name = 'Demo Operador'
  AND s.name = 'Hospital Central'
ON CONFLICT DO NOTHING;
