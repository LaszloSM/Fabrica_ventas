from groq import Groq
from app.models.deal import Deal
from datetime import datetime, timedelta
from typing import Optional, List
import json
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, groq_api_key: str, groq_model: str = "mixtral-8x7b-32768"):
        self.client = Groq(api_key=groq_api_key)
        self.model = groq_model

    async def analyze_deal(self, deal: Deal) -> dict:
        """
        Analizar deal con Groq (GRATIS)

        Retorna:
        {
            "closing_probability": 0-100,
            "risk_score": 0-10,
            "risks": [...],
            "recommendation": "..."
        }
        """
        try:
            days_in_stage = (datetime.utcnow() - deal.createdAt).days

            prompt = f"""
Eres un analista de ventas experto. Analiza esta oportunidad de venta:

INFORMACIÓN:
- Empresa: {deal.prospectId}
- Problema: {deal.problem}
- Beneficio: {deal.benefit}
- Valor: ${deal.value if deal.value else 'No especificado'}
- Etapa actual: {deal.stage}
- Días en esta etapa: {days_in_stage}
- Próxima acción: {deal.nextAction}

Proporciona análisis en JSON SOLO:
{{
    "closing_probability": <número 0-100>,
    "risk_score": <número 0-10>,
    "risks": [<máximo 3 riesgos>],
    "recommendation": "<recomendación corta>",
    "confidence": <0-100>
}}

SOLO JSON, sin markdown.
"""

            message = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.3,
                max_tokens=400,
                top_p=0.9
            )

            response_text = message.choices[0].message.content.strip()
            analysis = json.loads(response_text)

            logger.info(f"✅ Análisis IA completado para deal {deal.id}")
            return analysis

        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON de Groq: {e}")
            return {
                "closing_probability": 50,
                "risk_score": 5,
                "risks": ["Error en análisis"],
                "recommendation": "Revisar manualmente",
                "confidence": 0
            }
        except Exception as e:
            logger.error(f"❌ Error llamando a Groq: {e}")
            return {
                "closing_probability": 50,
                "risk_score": 5,
                "risks": ["Groq no disponible"],
                "recommendation": "Intentar más tarde",
                "confidence": 0
            }

    async def detect_risks(self, deal: Deal) -> List[str]:
        """Detectar riesgos automáticos del deal"""
        risks = []

        # Risk 1: Aging (sin movimiento > 14 días)
        days_without_movement = (datetime.utcnow() - deal.updatedAt).days
        if days_without_movement > 14:
            risks.append(f"⚠️ Sin movimiento {days_without_movement} días")

        # Risk 2: Sin próxima acción
        if not deal.nextAction or not deal.nextAction.strip():
            risks.append("⚠️ Próxima acción no definida")

        # Risk 3: Muy tiempo en etapa
        if days_without_movement > 21:
            risks.append(f"⚠️ Más de 3 semanas en {deal.stage}")

        return risks[:3]

    async def get_recommendations(self, deals: List[Deal]) -> List[str]:
        """Recomendaciones generales basadas en pipeline"""

        if not deals:
            return ["No hay datos para analizar"]

        aging_count = sum(1 for d in deals if (datetime.utcnow() - d.updatedAt).days > 14)
        won_count = sum(1 for d in deals if d.stage == "GANADO")
        lost_count = sum(1 for d in deals if d.stage == "PERDIDO")
        total_value = sum(d.ponderatedValue or 0 for d in deals)

        recommendations = []

        if aging_count > len(deals) * 0.3:
            recommendations.append(f"🔴 {aging_count} deals estancados - requieren atención INMEDIATA")

        if won_count > 0:
            recommendations.append(f"🟢 {won_count} deals ganados - mantener momentum")

        if lost_count > len(deals) * 0.2:
            recommendations.append(f"📊 {lost_count} deals perdidos - analizar tasa de conversión")

        if total_value == 0:
            recommendations.append("📈 Falta especificar valores en deals")

        if not recommendations:
            recommendations.append("✅ Pipeline saludable - continuar con prospección")

        return recommendations
