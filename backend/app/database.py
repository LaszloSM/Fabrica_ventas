from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    global client, db
    try:
        if settings.USE_MOCK_DB:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[settings.COSMOS_DATABASE]
            logger.info("✅ Usando MongoDB en memoria (modo DEV)")
        else:
            client = AsyncIOMotorClient(settings.COSMOS_CONNECTION_STRING)
            db = client[settings.COSMOS_DATABASE]
            try:
                await db.command('ping')
                logger.info("✅ Conectado a Cosmos DB")
            except Exception as ping_err:
                # Soft-fail: connection string accepted, ping failed (throttling / transient).
                # Motor is lazy — actual queries will re-connect. Don't crash the container.
                logger.warning(f"⚠️ Cosmos DB ping failed (non-fatal): {ping_err}")
    except Exception as e:
        logger.error(f"❌ Error conectando a DB: {e}")
        raise

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("✅ Desconectado de DB")

async def get_db() -> AsyncIOMotorDatabase:
    return db
