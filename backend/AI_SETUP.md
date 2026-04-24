# Setup de IA con Groq (GRATIS)

## 1. Obtener GROQ_API_KEY (2 minutos)

### Paso 1: Ir a Groq Console
```
https://console.groq.com
```

### Paso 2: Sign Up (gratis)
- Email
- Contraseña
- Verificar email

### Paso 3: Copiar API Key
En el dashboard, busca "API Keys"
Copiar la key que comienza con: `gsk_...`

## 2. Configurar en .env.local

En `backend/.env.local`, reemplaza:
```
GROQ_API_KEY=gsk_TU_API_KEY_AQUI
```

Por tu key real. Ej:
```
GROQ_API_KEY=gsk_abc123def456...
```

## 3. Listo!

Backend automáticamente usará Groq para:
- Analizar deals
- Detectar riesgos
- Dar recomendaciones

## Costos

- **$0/mes** - Completamente gratis
- Sin límites en free tier
- Si creces, cambiar a OpenRouter ($5/mes) o Azure ($40/mes)

## Endpoints disponibles

- `POST /api/v1/ai/analyze-deal/{deal_id}` - Analizar deal
- `GET /api/v1/ai/risks/{deal_id}` - Detectar riesgos
- `GET /api/v1/ai/recommendations` - Recomendaciones
- `GET /api/v1/ai/health` - Estado

## Cambiar de IA después (fácil)

Solo cambiar:
1. Provider (Groq → OpenRouter → Azure)
2. API Key
3. Modelo

El resto del código NO cambia.
