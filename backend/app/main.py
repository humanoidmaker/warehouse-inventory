from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, products, stock, suppliers, settings as settings_api

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="StockFlow Warehouse API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(suppliers.router)
app.include_router(settings_api.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "StockFlow Warehouse"}

@app.get("/api/stats")
async def stats():
    from app.core.database import get_db as gdb
    db = await gdb()
    tp = await db.products.count_documents({"is_active": {"$ne": False}})
    ls = await db.products.count_documents({"is_active": {"$ne": False}, "$expr": {"$lte": ["$current_stock", "$min_stock"]}})
    ts = await db.suppliers.count_documents({"is_active": {"$ne": False}})
    pipe = [{"$match": {"is_active": {"$ne": False}}}, {"$group": {"_id": None, "value": {"$sum": {"$multiply": ["$current_stock", "$cost_price"]}}}}]
    r = await db.products.aggregate(pipe).to_list(1)
    sv = r[0]["value"] if r else 0
    return {"stats": {"total_products": tp, "low_stock": ls, "total_suppliers": ts, "stock_value": sv}}
