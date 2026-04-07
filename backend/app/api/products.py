from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/products", tags=["products"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_products(q: str = "", category: str = "", db=Depends(get_db)):
    f = {"is_active": {"$ne": False}}
    if q: f["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"sku": {"$regex": q, "$options": "i"}}]
    if category: f["category"] = category
    docs = await db.products.find(f).sort("name", 1).to_list(500)
    return {"success": True, "products": [s(d) for d in docs]}

@router.get("/low-stock")
async def low_stock(db=Depends(get_db)):
    docs = await db.products.find({"is_active": {"$ne": False}, "$expr": {"$lte": ["$current_stock", "$min_stock"]}}).to_list(100)
    return {"success": True, "products": [s(d) for d in docs]}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.setdefault("is_active", True); data.setdefault("current_stock", 0)
    r = await db.products.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{pid}")
async def update(pid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.pop("id", None); data.pop("_id", None)
    await db.products.update_one({"_id": ObjectId(pid)}, {"$set": data})
    return {"success": True}
