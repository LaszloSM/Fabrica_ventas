# FastAPI Backend

Desarrollo local:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Variables principales:

- `DATABASE_URL`: SQLite local por defecto, o PostgreSQL administrado en Azure.
- `PORT`: puerto usado por contenedor o App Service.

Despliegue sugerido en Azure:

- Azure Container Apps o Azure App Service for Containers.
- Base de datos PostgreSQL Flexible Server.
- `FASTAPI_BACKEND_URL` en el frontend apuntando al dominio publicado del backend.
