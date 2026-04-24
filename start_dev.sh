#!/bin/bash

echo "🚀 Iniciando CoimpactoB CRM Backend"
echo ""

# Verificar si .env.local existe
if [ ! -f "backend/.env.local" ]; then
    echo "❌ Error: backend/.env.local no existe"
    echo "Copia backend/.env.example a backend/.env.local"
    echo "Y configura tu GROQ_API_KEY"
    exit 1
fi

# Verificar si GROQ_API_KEY está configurado
if ! grep -q "GROQ_API_KEY=gsk_" backend/.env.local; then
    echo "⚠️ Advertencia: GROQ_API_KEY no parece estar configurado correctamente"
    echo "Asegúrate de actualizar backend/.env.local con tu API key"
fi

echo "📦 Levantando Docker Compose..."
docker-compose up -d

echo ""
echo "✅ Servicios iniciados:"
echo "  API:     http://localhost:8000"
echo "  Docs:    http://localhost:8000/docs"
echo "  MongoDB: mongodb://localhost:27017"
echo ""
echo "🎯 Primeros pasos:"
echo "  1. Abre http://localhost:8000/docs en tu navegador"
echo "  2. Prueba el health check: GET /health"
echo "  3. Crea un prospect: POST /api/v1/prospects"
echo "  4. Crea un deal: POST /api/v1/deals"
echo ""
echo "Para detener: docker-compose down"
