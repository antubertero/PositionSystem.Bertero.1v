OWNER ?= example
REPO ?= control-personal

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

seed:
	docker compose exec postgres psql -U app -d control_personal -f /docker-entrypoint-initdb.d/20-seeds.sql

.PHONY: build up down seed
