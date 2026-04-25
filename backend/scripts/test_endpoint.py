import asyncio
from app.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.deal_service import DealService

async def test():
    client = AsyncIOMotorClient(settings.COSMOS_CONNECTION_STRING)
    db = client[settings.COSMOS_DATABASE]
    svc = DealService(db)
    
    deals, total = await svc.list_deals(limit=2)
    print('Got', len(deals), 'deals')
    
    prospects = {}
    async for doc in db['prospects'].find({}):
        doc['id'] = doc['_id']
        prospects[doc['_id']] = doc
    print('Loaded', len(prospects), 'prospects')
    
    for deal in deals:
        pr = prospects.get(deal.prospectId)
        name = pr.get('name') if pr else 'N/A'
        print('Deal', deal.id, 'prospectId=', deal.prospectId, 'found=', pr is not None, 'name=', name)

asyncio.run(test())
