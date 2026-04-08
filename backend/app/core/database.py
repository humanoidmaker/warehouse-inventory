from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
db = None

async def get_db():
    return db

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_name = settings.MONGODB_URI.rsplit("/", 1)[-1].split("?")[0] or "warehouse_inv"
    db = client[db_name]
    await db.products.create_index("sku", unique=True)
    await db.products.create_index("barcode")
    await db.suppliers.create_index("phone", unique=True, sparse=True)
    await db.purchase_orders.create_index("po_number", unique=True)
    if not await db.settings.find_one({"key": "warehouse_name"}):
        await db.settings.insert_many([
            {"key": "warehouse_name", "value": "StockFlow Warehouse"},
            {"key": "warehouse_address", "value": "Industrial Area, Sector 5"},
            {"key": "currency", "value": "INR"},
            {"key": "tax_rate", "value": "18"},
            {"key": "low_stock_alert", "value": "true"},
        ])
    if await db.categories.count_documents({}) == 0:
        for c in ["Electronics Components", "Raw Materials", "Packaging", "Tools", "Office Supplies"]:
            await db.categories.insert_one({"name": c, "slug": c.lower().replace(" ", "-")})

    # Email settings defaults
    email_defaults = [
        {"key": "smtp_host", "value": ""},
        {"key": "smtp_port", "value": "587"},
        {"key": "smtp_user", "value": ""},
        {"key": "smtp_pass", "value": ""},
        {"key": "smtp_from", "value": ""},
        {"key": "email_verification_enabled", "value": "true"},
        {"key": "email_welcome_enabled", "value": "true"},
        {"key": "email_password_reset_enabled", "value": "true"},
        {"key": "email_password_changed_enabled", "value": "true"},
        {"key": "require_email_verification", "value": "false"},
    ]
    for d in email_defaults:
        await db.settings.update_one({"key": d["key"]}, {"$setOnInsert": d}, upsert=True)

