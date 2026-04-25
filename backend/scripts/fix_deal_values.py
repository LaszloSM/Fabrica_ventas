import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_values():
    # Connection string from env
    conn_str = os.getenv("COSMOSDB_CONN_STR")  # set this env var at runtime
    client = AsyncIOMotorClient(conn_str)
    db = client["fabrica_ventas"]
    
    default_values = {
        'CONSULTORIA_PROYECTO': 150000000,
        'ACADEMIA_CURSO': 35000000,
        'CREDIMPACTO_GRUPOS': 50000000,
        'CREDIMPACTO_CREDITOS': 25000000,
        'FUNDACION_CONVENIO': 80000000,
    }
    
    probabilities = {
        'PROSPECTO_IDENTIFICADO': 5.0,
        'SENAL_DETECTADA': 10.0,
        'PRIMER_CONTACTO': 20.0,
        'EN_SECUENCIA': 35.0,
        'REUNION_AGENDADA': 50.0,
        'PROPUESTA_ENVIADA': 65.0,
        'NEGOCIACION': 80.0,
        'GANADO': 100.0,
        'PERDIDO': 0.0,
    }
    
    updated = 0
    async for deal in db['deals'].find({'value': None}):
        svc = deal.get('serviceType', 'CONSULTORIA_PROYECTO')
        stage = deal.get('stage', 'PROSPECTO_IDENTIFICADO')
        value = default_values.get(svc, 50000000)
        prob = probabilities.get(stage, 5.0)
        ponderated = value * (prob / 100.0)
        
        result = await db['deals'].update_one(
            {'_id': deal['_id']},
            {'$set': {'value': value, 'ponderatedValue': ponderated}}
        )
        if result.modified_count > 0:
            updated += 1
        if updated % 200 == 0:
            print(f'Updated {updated}...')
    
    print(f'Total updated: {updated}')
    
    # Verify
    deals = await db['deals'].find({}).to_list(length=None)
    total_pipeline = sum((d.get('ponderatedValue') or 0) for d in deals)
    total_value = sum((d.get('value') or 0) for d in deals)
    print(f'Total pipeline: ${total_pipeline:,.0f}')
    print(f'Total value: ${total_value:,.0f}')

if __name__ == '__main__':
    asyncio.run(fix_values())
