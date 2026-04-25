"""
Importa contactos desde CSVs locales en data/ a la base de datos.

Uso:
  cd backend
  pip install motor pymongo
  python scripts/import_local_csvs.py

  # Para forzar reimportación (borra datos existentes):
  python scripts/import_local_csvs.py --force
"""

import asyncio
import csv
import io
import os
import sys
from pathlib import Path
from datetime import datetime

# Añadir el directorio padre al path para importar app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.services.import_service import ImportService

async def main():
    force = "--force" in sys.argv or "-f" in sys.argv

    # Determinar conexión a DB
    if settings.USE_MOCK_DB:
        print("⚠️  USE_MOCK_DB=True en .env.local")
        print("   Los datos se importarán a memoria y NO persistirán.")
        print("   Para persistir, cambia USE_MOCK_DB=False y configura COSMOS_CONNECTION_STRING.")
        print("")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
    else:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.COSMOS_CONNECTION_STRING)
            await client.admin.command("ping")
            print(f"✅ Conectado a MongoDB: {settings.COSMOS_CONNECTION_STRING[:60]}...")
        except Exception as e:
            print(f"❌ No se pudo conectar a MongoDB: {e}")
            print("   Verifica COSMOS_CONNECTION_STRING en backend/.env.local")
            sys.exit(1)

    db = client[settings.COSMOS_DATABASE]

    # Verificar si ya hay datos
    existing = await db["prospects"].count_documents({})
    if existing > 0 and not force:
        print(f"⚠️  Ya existen {existing} prospects en la BD.")
        print(f"   Usa --force para reimportar (esto borrará todos los datos existentes).")
        sys.exit(0)

    # Encontrar archivos CSV
    data_dir = Path(__file__).parent.parent.parent / "data"
    csv_files = sorted(data_dir.glob("*.csv"))

    if not csv_files:
        print(f"❌ No se encontraron archivos CSV en {data_dir}")
        sys.exit(1)

    print(f"📁 Archivos CSV encontrados: {len(csv_files)}")
    for f in csv_files:
        print(f"   - {f.name}")
    print("")

    # Leer contenido de cada CSV
    file_contents = {}
    for csv_path in csv_files:
        with open(csv_path, "r", encoding="utf-8") as f:
            content = f.read()
        if content.strip():
            file_contents[csv_path.name] = content

    if not file_contents:
        print("❌ Los archivos CSV están vacíos")
        sys.exit(1)

    # Importar
    service = ImportService(db)
    result = await service.import_from_files(file_contents, force=force)

    if result.get("error"):
        print(f"❌ ERROR: {result['message']}")
        sys.exit(1)

    stats = result["data"]
    print("\n✅ IMPORTACIÓN COMPLETADA")
    print(f"   Prospects (empresas):  {stats['prospects']}")
    print(f"   Contacts (personas):   {stats['contacts']}")
    print(f"   Deals (oportunidades): {stats['deals']}")
    print(f"   Activities (outreach): {stats['activities']}")
    print(f"   Team members:          {stats['team_members']}")
    print(f"   Duplicados omitidos:   {stats['duplicates_skipped']}")
    print(f"   Filas procesadas:      {stats['rows_processed']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
