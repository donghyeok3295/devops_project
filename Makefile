SHELL := /bin/bash

up:      ; docker compose -f infra/docker-compose.yml up -d
down:    ; docker compose -f infra/docker-compose.yml down
logs:    ; docker compose -f infra/docker-compose.yml logs -f --tail=100
api:     ; docker compose -f infra/docker-compose.yml exec api bash
fe:      ; docker compose -f infra/docker-compose.yml exec frontend sh
ai:      ; docker compose -f infra/docker-compose.yml exec ai bash
