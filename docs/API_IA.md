# API de IA - Groq (GRATIS)

## Costo
- **$0/mes** - Completamente gratis
- Sin límites en free tier
- Modelo: Mixtral 8x7B

## Endpoints

### POST /api/v1/ai/analyze-deal/{deal_id}
Analizar oportunidad con IA

Ejemplo:
```
curl -X POST http://localhost:8000/api/v1/ai/analyze-deal/deal_123
```

Response:
```json
{
  "dealId": "deal_123",
  "prospect": "prospect_123",
  "analysis": {
    "closing_probability": 75,
    "risk_score": 3,
    "risks": ["Sin movimiento 10 días"],
    "recommendation": "Agendar reunión urgente",
    "confidence": 85
  }
}
```

### GET /api/v1/ai/risks/{deal_id}
Detectar riesgos automáticos

Response:
```json
{
  "dealId": "deal_123",
  "risks": ["⚠️ Sin movimiento 10 días"],
  "riskLevel": "medium"
}
```

### GET /api/v1/ai/recommendations
Recomendaciones generales del pipeline

Response:
```json
{
  "totalDeals": 25,
  "recommendations": [
    "🟢 3 deals ganados - mantener momentum",
    "📊 2 deals perdidos - analizar tasa de conversión"
  ]
}
```

### GET /api/v1/ai/health
Estado de Groq

Response:
```json
{
  "status": "ok",
  "provider": "Groq",
  "model": "mixtral-8x7b-32768",
  "cost": "$0/mes (GRATIS)",
  "message": "IA completamente funcional"
}
```

## Cómo usar

1. Obtener GROQ_API_KEY en https://console.groq.com (GRATIS)
2. Configurar en .env.local
3. Usar endpoints

## Precisión
- 75% (suficiente para MVP)
- Después puedes cambiar a OpenRouter ($5/mes) o Azure OpenAI ($40/mes)
