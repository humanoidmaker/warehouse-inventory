from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/stock", tags=["stock"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.post("/in")
async def stock_in(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    product = await db.products.find_one({"_id": ObjectId(data["product_id"])})
    if not product: raise HTTPException(404, "Product not found")
    qty = data.get("quantity", 0)
    await db.products.update_one({"_id": ObjectId(data["product_id"])}, {"$inc": {"current_stock": qty}})
    await db.stock_movements.insert_one({
        "type": "in", "product_id": data["product_id"], "product_name": product["name"], "product_sku": product.get("sku", ""),
        "quantity": qty, "unit_price": data.get("unit_price", 0), "total_price": qty * data.get("unit_price", 0),
        "supplier_id": data.get("supplier_id"), "reference_number": data.get("reference_number", ""),
        "reason": "Purchase", "notes": data.get("notes", ""), "created_by": user["id"], "created_at": datetime.now(timezone.utc),
    })
    return {"success": True, "message": f"Added {qty} units of {product['name']}"}

@router.post("/out")
async def stock_out(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    product = await db.products.find_one({"_id": ObjectId(data["product_id"])})
    if not product: raise HTTPException(404, "Product not found")
    qty = data.get("quantity", 0)
    if product.get("current_stock", 0) < qty: raise HTTPException(400, "Insufficient stock")
    await db.products.update_one({"_id": ObjectId(data["product_id"])}, {"$inc": {"current_stock": -qty}})
    await db.stock_movements.insert_one({
        "type": "out", "product_id": data["product_id"], "product_name": product["name"], "product_sku": product.get("sku", ""),
        "quantity": qty, "reason": data.get("reason", "Dispatch"), "notes": data.get("notes", ""),
        "created_by": user["id"], "created_at": datetime.now(timezone.utc),
    })
    return {"success": True, "message": f"Removed {qty} units of {product['name']}"}

@router.post("/adjust")
async def adjust(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    product = await db.products.find_one({"_id": ObjectId(data["product_id"])})
    if not product: raise HTTPException(404, "Product not found")
    change = data.get("quantity_change", 0)
    await db.products.update_one({"_id": ObjectId(data["product_id"])}, {"$inc": {"current_stock": change}})
    await db.stock_movements.insert_one({
        "type": "adjustment", "product_id": data["product_id"], "product_name": product["name"],
        "quantity": abs(change), "reason": data.get("reason", "Manual adjustment"), "notes": data.get("notes", ""),
        "created_by": user["id"], "created_at": datetime.now(timezone.utc),
    })
    return {"success": True}

@router.get("/movements")
async def movements(type: str = "", product_id: str = "", db=Depends(get_db), user=Depends(get_current_user)):
    f = {}
    if type: f["type"] = type
    if product_id: f["product_id"] = product_id
    docs = await db.stock_movements.find(f).sort("created_at", -1).to_list(500)
    return {"success": True, "movements": [s(d) for d in docs]}
