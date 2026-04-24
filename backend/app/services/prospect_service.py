from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.prospect import Prospect
from typing import List, Optional
from datetime import datetime
import uuid

class ProspectService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db["prospects"]

    async def create_prospect(self, prospect_data: dict) -> Prospect:
        """Crear prospect"""
        prospect_data["_id"] = f"prospect_{uuid.uuid4().hex[:12]}"
        prospect_data["createdAt"] = datetime.utcnow()
        prospect_data["updatedAt"] = datetime.utcnow()

        await self.collection.insert_one(prospect_data)
        prospect_data["id"] = prospect_data["_id"]
        return Prospect(**prospect_data)

    async def get_prospect(self, prospect_id: str) -> Optional[Prospect]:
        """Obtener prospect por ID"""
        doc = await self.collection.find_one({"_id": prospect_id})
        if doc:
            doc["id"] = doc["_id"]
            return Prospect(**doc)
        return None

    async def list_prospects(self, skip: int = 0, limit: int = 20,
                             search: str = "",
                             region: Optional[str] = None) -> tuple[List[Prospect], int]:
        """Listar prospects con filtros"""
        query = {}
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        if region:
            query["region"] = region

        docs = await self.collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        total = await self.collection.count_documents(query)

        prospects = []
        for doc in docs:
            doc["id"] = doc["_id"]
            prospects.append(Prospect(**doc))

        return (prospects, total)

    async def update_prospect(self, prospect_id: str, update_data: dict) -> Optional[Prospect]:
        """Actualizar prospect"""
        update_data["updatedAt"] = datetime.utcnow()
        await self.collection.update_one({"_id": prospect_id}, {"$set": update_data})
        return await self.get_prospect(prospect_id)

    async def delete_prospect(self, prospect_id: str) -> bool:
        """Eliminar prospect"""
        result = await self.collection.delete_one({"_id": prospect_id})
        return result.deleted_count > 0
