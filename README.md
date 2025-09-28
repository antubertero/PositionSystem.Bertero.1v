# Sistema General de Control de Personal en Tiempo Real

Este repositorio contiene una implementación de referencia lista para ejecutar del **Sistema General de Control de Personal en Tiempo Real** para hospitales, restaurantes y bancos.

## Puesta en marcha

```bash
cp .env.example .env
docker compose up -d --build
```

Servicios disponibles:
- Backend Node: http://localhost:8080/health
- Backend Go (referencia): http://localhost:8081/health
- Frontend SPA: http://localhost:5173

## Prueba rápida

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/people \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Supervisora","role":"Supervisor","hierarchy":"Senior","specialty":"Guardia","unit":"Emergencias"}'
curl http://localhost:8080/people
curl -X POST http://localhost:8080/events/presence \
  -H "Content-Type: application/json" \
  -d '{"id":"00000000-0000-4000-8000-000000000001","person_id":1,"ts":"2024-01-01T08:00:00Z","source":"biometric","type":"entry","payload":{}}'
curl "http://localhost:8080/status/now"
```

## Arquitectura
- **backend-node/**: API principal en Node.js/Express con reglas de motor de estados y conexión PostgreSQL.
- **backend-go/**: Implementación de referencia en Go (Gin) siguiendo el mismo contrato OpenAPI.
- **app/**: SPA React + TypeScript + Vite + Tailwind para onboarding, gestión de personas, importación CSV y sandbox de eventos.
- **db/**: scripts SQL de inicialización y seeds.
- **mobile-flutter/**: esqueleto de aplicación móvil Flutter.
- **openapi.yaml**: especificación OpenAPI 3.0 compartida.
- **docker-compose.yml** y **Makefile**: orquestación local.

### Notas operativas
- Se sugiere configurar TTL sobre `presence_event` mediante políticas de retención en PostgreSQL o jobs externos (p.ej. 90 días).
- Mensajería (Kafka/RabbitMQ) y OLAP (ClickHouse) se pueden habilitar siguiendo los comentarios del README.
- Variables de entorno clave: `JWT_SECRET`, `DB_URL`, `GEO_FENCE_R`, `BREAK_MAX_MIN`, `RETENTION_RAW_DAYS`, `RETENTION_AUDIT_YEARS`.

## Makefile

```bash
make build
make up
make down
make seed
```

## CI/CD
El workflow en `.github/workflows/ci.yml` construye imágenes Docker y las publica en GHCR usando `ghcr.io/<OWNER>/<REPO>-backend:latest` y `ghcr.io/<OWNER>/<REPO>-frontend:latest`.

## Documentación adicional
- **Motor de estados**: Implementado como función pura tanto en Node como en Go con pruebas unitarias.
- **Importación CSV**: disponible desde la SPA para cargar personas masivamente.
- **Sandbox de eventos**: permite simular señales de presencia desde la interfaz.
- **Diagnóstico**: muestra variables de entorno críticas y estado del backend.

## Mensajería y analítica
- Para una cola de eventos en tiempo real se puede utilizar Kafka o RabbitMQ (no incluidos en `docker-compose.yml`).
- Para analítica histórica se recomienda un almacén columnar (ej. ClickHouse); consulte el README para integración futura.

## Empaquetado

El archivo `control-personal-full.zip` puede generarse ejecutando:

```bash
zip -r control-personal-full.zip .
```

Si necesita transportar el ZIP como base64:

```bash
zip -r control-personal-full.zip .
base64 control-personal-full.zip > control-personal-full.b64
# reconstrucción
base64 -d control-personal-full.b64 > control-personal-full.zip && unzip control-personal-full.zip
```
