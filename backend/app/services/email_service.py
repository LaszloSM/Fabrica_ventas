import logging
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, sendgrid_api_key: Optional[str] = None, from_email: str = "noreply@coimpactob.com"):
        self.sendgrid_api_key = sendgrid_api_key
        self.from_email = from_email

        if sendgrid_api_key:
            try:
                from sendgrid import SendGridAPIClient
                self.sg = SendGridAPIClient(sendgrid_api_key)
                self.enabled = True
                logger.info("✅ SendGrid habilitado")
            except Exception as e:
                self.enabled = False
                logger.warning(f"⚠️ SendGrid no configurado: {e}")
        else:
            self.enabled = False
            logger.info("ℹ️ SendGrid deshabilitado (opcional para MVP)")

    async def send_aging_alert(self, recipient: str, deal):
        """Alertar sobre deal estancado"""

        if not self.enabled:
            logger.info(f"ℹ️ Email no enviado (SendGrid no configurado): {recipient}")
            return

        from sendgrid.helpers.mail import Mail

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>⚠️ Alerta: Oportunidad Estancada</h2>
                <p>Hola,</p>
                <p>La siguiente oportunidad no ha tenido movimiento en 14 días:</p>
                <hr>
                <h3>{deal.prospectId}</h3>
                <p><strong>Línea:</strong> {deal.line}</p>
                <p><strong>Valor:</strong> ${deal.value if deal.value else 'N/A'}</p>
                <p><strong>Etapa:</strong> {deal.stage}</p>
                <p><strong>Próxima acción:</strong> {deal.nextAction}</p>
                <hr>
                <p>✅ Por favor, toma acción inmediata.</p>
            </body>
        </html>
        """

        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=recipient,
                subject=f"⚠️ Alerta Aging: {deal.prospectId}",
                html_content=html
            )
            self.sg.send(message)
            logger.info(f"✅ Email enviado a {recipient}")
        except Exception as e:
            logger.error(f"❌ Error enviando email: {e}")

    async def send_daily_summary(self, recipient: str, summary_data: dict):
        """Enviar resumen diario"""

        if not self.enabled:
            logger.info(f"ℹ️ Resumen no enviado (SendGrid no configurado)")
            return

        from sendgrid.helpers.mail import Mail

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>📊 Resumen Diario - Pipeline</h2>
                <p>Hola,</p>

                <h3>📈 Métricas</h3>
                <ul>
                    <li>Total Pipeline: ${summary_data.get('total_pipeline', 0):,.0f}</li>
                    <li>Deals Activos: {summary_data.get('active_deals', 0)}</li>
                    <li>Aging (>14 días): {summary_data.get('aging_count', 0)}</li>
                </ul>

                <hr>
                <p>✅ Accede a tu dashboard para más detalles.</p>
            </body>
        </html>
        """

        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=recipient,
                subject="📊 Resumen Diario de Pipeline",
                html_content=html
            )
            self.sg.send(message)
            logger.info(f"✅ Resumen enviado a {recipient}")
        except Exception as e:
            logger.error(f"❌ Error enviando resumen: {e}")
