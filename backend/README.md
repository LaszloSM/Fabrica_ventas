# CoimpactoB CRM - Backend API

Backend completo: FastAPI + MongoDB + Groq AI + Scheduler.

## Quick Start

```bash
cp .env.example .env.local
# Agregar GROQ_API_KEY en .env.local
docker-compose up  # desde raíz del proyecto
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Testing

```bash
python -m pytest tests/ -v
```

## Stack

FastAPI 0.115 · MongoDB/Cosmos DB · Groq AI ($0/mes) · APScheduler · Docker · Azure

Ver docs/DEPLOY.md para deploy a Azure.
