from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, db, ai_service, email_service):
        self.db = db
        self.ai_service = ai_service
        self.email_service = email_service
        self.scheduler = AsyncIOScheduler()

    def add_jobs(self):
        """Agregar todos los trabajos cronogramados"""

        self.scheduler.add_job(
            self.check_aging_deals,
            'interval',
            hours=1,
            id='check_aging_deals',
            name='Check aging deals every hour'
        )
        logger.info("✅ Job agregado: check_aging_deals (cada 1 hora)")

        self.scheduler.add_job(
            self.analyze_deals_with_ai,
            'interval',
            hours=6,
            id='analyze_deals_with_ai',
            name='Analyze deals with AI every 6 hours'
        )
        logger.info("✅ Job agregado: analyze_deals_with_ai (cada 6 horas)")

        self.scheduler.add_job(
            self.send_weekly_report,
            'cron',
            day_of_week='mon',
            hour=8,
            minute=0,
            id='weekly_report',
            name='Send weekly report Monday 8am'
        )
        logger.info("✅ Job agregado: weekly_report (lunes 8am)")

        self.scheduler.add_job(
            self.cleanup_old_data,
            'cron',
            day_of_week='sun',
            hour=2,
            minute=0,
            id='cleanup_old_data',
            name='Cleanup old data Sunday 2am'
        )
        logger.info("✅ Job agregado: cleanup_old_data (domingo 2am)")

    async def check_aging_deals(self):
        """Verificar deals sin movimiento > 14 días"""
        try:
            from app.services.deal_service import DealService

            deal_service = DealService(self.db)
            aging_deals = await deal_service.get_aging_deals(days=14)

            if aging_deals:
                logger.warning(f"⚠️ {len(aging_deals)} deals estancados detectados")
            else:
                logger.info("✅ No hay deals aging")
        except Exception as e:
            logger.error(f"❌ Error en check_aging_deals: {e}")

    async def analyze_deals_with_ai(self):
        """Analizar todos los deals con IA y guardar insights"""
        try:
            from app.services.deal_service import DealService

            deal_service = DealService(self.db)
            deals, _ = await deal_service.list_deals(limit=1000)

            analyzed = 0
            for deal in deals:
                if deal.stage not in ["GANADO", "PERDIDO"]:
                    analysis = await self.ai_service.analyze_deal(deal)

                    insight_doc = {
                        "_id": f"insight_{deal.id}_{datetime.utcnow().timestamp()}",
                        "dealId": deal.id,
                        "insightType": "closing_probability",
                        "confidence": analysis.get("confidence", 0),
                        "insight": str(analysis),
                        "generatedAt": datetime.utcnow()
                    }

                    await self.db["ai_insights"].insert_one(insight_doc)
                    analyzed += 1

            logger.info(f"✅ Analizados {analyzed} deals con IA")
        except Exception as e:
            logger.error(f"❌ Error en analyze_deals_with_ai: {e}")

    async def send_weekly_report(self):
        """Enviar reporte semanal a responsables"""
        try:
            from app.services.deal_service import DealService

            deal_service = DealService(self.db)
            deals, _ = await deal_service.list_deals(limit=1000)

            deals_by_owner = {}
            for deal in deals:
                owner = deal.assignedTo or "unassigned"
                if owner not in deals_by_owner:
                    deals_by_owner[owner] = []
                deals_by_owner[owner].append(deal)

            for owner_id, owner_deals in deals_by_owner.items():
                summary = {
                    "total_pipeline": sum(d.ponderatedValue or 0 for d in owner_deals),
                    "active_deals": len([d for d in owner_deals if d.stage not in ["GANADO", "PERDIDO"]]),
                    "deals_won": len([d for d in owner_deals if d.stage == "GANADO"]),
                    "deals_lost": len([d for d in owner_deals if d.stage == "PERDIDO"]),
                    "aging_count": len([d for d in owner_deals if (datetime.utcnow() - d.updatedAt).days > 14])
                }
                logger.info(f"✅ Reporte semanal generado para {owner_id}: {summary}")
        except Exception as e:
            logger.error(f"❌ Error en send_weekly_report: {e}")

    async def cleanup_old_data(self):
        """Limpiar datos viejos (> 90 días sin movimiento)"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=90)

            result = await self.db["deals"].update_many(
                {
                    "stage": "PERDIDO",
                    "updatedAt": {"$lt": cutoff_date}
                },
                {"$set": {"archived": True}}
            )

            logger.info(f"✅ {result.modified_count} deals antiguos archivados")
        except Exception as e:
            logger.error(f"❌ Error en cleanup_old_data: {e}")

    def start(self):
        """Iniciar scheduler"""
        self.add_jobs()
        self.scheduler.start()
        logger.info("🟢 Scheduler iniciado")

    def shutdown(self):
        """Detener scheduler"""
        self.scheduler.shutdown()
        logger.info("🔴 Scheduler detenido")
