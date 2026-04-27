"""
Resetea los valores de deals a None (sin valor).
Usa esto si queres limpiar los valores mockup y empezar con valores reales.
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def reset_values():
    conn_str = os.getenv("COSMOSDB_CONN_STR")
    client = AsyncIOMotorClient(conn_str)
    db = client["fabrica_ventas"]

    result = await db["deals"].update_many(
        {"value": {"$ne": None}},
        {"$set": {"value": None, "ponderatedValue": None}}
    )
    print(f"Deals con valor reseteado: {result.modified_count}")

    deals = await db["deals"].find({"value": {"$ne": None}}).to_list(length=None)
    print(f"Deals con valor pendiente: {len(deals)}")
    print("Todos los deals estan en $0 (sin valor asignado).")
    print("Ahora los vendedores deben ingresar los valores reales desde el CRM.")

if __name__ == "__main__":
    asyncio.run(reset_values())
