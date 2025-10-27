# Smart Lost & Found (Scaffold)

## Monorepo
- apps/frontend (Next.js 14 PWA)
- apps/api (FastAPI + Oracle)
- services/ai (FastAPI microservice)
- contracts (OpenAPI contract)
- infra (docker-compose)

## Run (Dev)
\\\ash
cp .env.example .env
make up
\\\

## Branch strategy
- main (protected) / dev (integration) / feature/* (per task)
- Small PRs + Squash merge

## Hard rules
- DB: Oracle only
- PK: SEQUENCE + BEFORE INSERT TRIGGER
- API contract: contracts/openapi.yaml is source of truth
