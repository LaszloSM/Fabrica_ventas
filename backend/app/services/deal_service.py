from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.deal import Deal
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

class DealService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["deals"]

    async def create_deal(self, deal_data: dict, user_id: str) -> Deal:
        """Crear deal con validaciones"""

        if not deal_data.get("problem") or not deal_data["problem"].strip():
            raise ValueError("problem: campo obligatorio")
        if not deal_data.get("benefit") or not deal_data["benefit"].strip():
            raise ValueError("benefit: campo obligatorio")
        if not deal_data.get("nextAction") or not deal_data["nextAction"].strip():
            raise ValueError("nextAction: campo obligatorio")

        if deal_data.get("nextActionDate") <= datetime.utcnow():
            raise ValueError("nextActionDate debe ser en el futuro")

        deal_data["_id"] = f"deal_{uuid.uuid4().hex[:12]}"
        deal_data["createdAt"] = datetime.utcnow()
        deal_data["updatedAt"] = datetime.utcnow()
        deal_data["assignedTo"] = deal_data.get("assignedTo") or user_id
        deal_data["stage"] = "PROSPECTO_IDENTIFICADO"
        deal_data["probability"] = 0.0
        deal_data["ponderatedValue"] = 0.0

        await self.collection.insert_one(deal_data)
        deal_data["id"] = deal_data["_id"]
        return Deal(**deal_data)

    async def get_deal(self, deal_id: str) -> Optional[Deal]:
        """Obtener deal por ID"""
        doc = await self.collection.find_one({"_id": deal_id})
        if doc:
            doc["id"] = doc["_id"]
            return Deal(**doc)
        return None

    async def list_deals(self, skip: int = 0, limit: int = 20,
                         stage: Optional[str] = None,
                         owner: Optional[str] = None,
                         line: Optional[str] = None) -> tuple[List[Deal], int]:
        """Listar deals con filtros"""
        query = {}
        if stage:
            query["stage"] = stage
        if owner:
            query["assignedTo"] = owner
        if line:
            query["line"] = line

        docs = await self.collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        total = await self.collection.count_documents(query)

        deals = []
        for doc in docs:
            doc["id"] = doc["_id"]
            deals.append(Deal(**doc))

        return (deals, total)

    async def get_aging_deals(self, days: int = 14) -> List[Deal]:
        """Obtener deals sin movimiento > X días"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = {
            "stage": {"$nin": ["GANADO", "PERDIDO"]},
            "updatedAt": {"$lt": cutoff_date}
        }
        docs = await self.collection.find(query).to_list(length=None)
        deals = []
        for doc in docs:
            doc["id"] = doc["_id"]
            deals.append(Deal(**doc))
        return deals

    async def move_to_stage(self, deal_id: str, new_stage: str, user_id: str) -> Optional[Deal]:
        """Mover deal a nueva etapa"""
        probability = self._get_probability_by_stage(new_stage)

        deal = await self.get_deal(deal_id)
        if not deal:
            return None

        update_data = {
            "stage": new_stage,
            "probability": probability,
            "updatedAt": datetime.utcnow()
        }

        if deal.value:
            update_data["ponderatedValue"] = deal.value * (probability / 100)

        await self.collection.update_one({"_id": deal_id}, {"$set": update_data})

        activity_data = {
            "_id": f"activity_{uuid.uuid4().hex[:12]}",
            "dealId": deal_id,
            "type": "NOTE",
            "notes": f"Deal movido a {new_stage}",
            "createdById": user_id,
            "doneAt": datetime.utcnow(),
            "createdAt": datetime.utcnow()
        }
        await self.db["activities"].insert_one(activity_data)

        return await self.get_deal(deal_id)

    async def mark_won(self, deal_id: str) -> Optional[Deal]:
        """Marcar deal como ganada"""
        update_data = {
            "stage": "GANADO",
            "probability": 100.0,
            "wonAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        await self.collection.update_one({"_id": deal_id}, {"$set": update_data})
        return await self.get_deal(deal_id)

    async def mark_lost(self, deal_id: str, reason: str) -> Optional[Deal]:
        """Marcar deal como perdida"""
        update_data = {
            "stage": "PERDIDO",
            "probability": 0.0,
            "ponderatedValue": 0.0,
            "lostReason": reason,
            "updatedAt": datetime.utcnow()
        }
        await self.collection.update_one({"_id": deal_id}, {"$set": update_data})
        return await self.get_deal(deal_id)

    async def update_deal(self, deal_id: str, update_data: dict) -> Optional[Deal]:
        """Actualizar deal"""
        update_data["updatedAt"] = datetime.utcnow()
        await self.collection.update_one({"_id": deal_id}, {"$set": update_data})
        return await self.get_deal(deal_id)

    @staticmethod
    def _get_probability_by_stage(stage: str) -> float:
        """Probabilidad por etapa"""
        probabilities = {
            "PROSPECTO_IDENTIFICADO": 5.0,
            "PRIMER_CONTACTO": 10.0,
            "REUNION_AGENDADA": 25.0,
            "DIAGNOSTICO": 35.0,
            "PROPUESTA_ENVIADA": 50.0,
            "NEGOCIACION": 75.0,
            "GANADO": 100.0,
            "PERDIDO": 0.0,
        }
        return probabilities.get(stage, 0.0)
