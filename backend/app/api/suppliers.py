from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_suppliers(db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.suppliers.find({"is_active": {"$ne": False}}).sort("name", 1).to_list(100)
    return {"success": True, "suppliers": [s(d) for d in docs]}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.setdefault("is_active", True)
    r = await db.suppliers.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{sid}")
async def update(sid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.pop("id", None); data.pop("_id", None)
    await db.suppliers.update_one({"_id": ObjectId(sid)}, {"$set": data})
    return {"success": True}
