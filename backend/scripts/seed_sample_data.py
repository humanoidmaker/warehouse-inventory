import asyncio, sys, random
from datetime import datetime, timezone, timedelta
sys.path.insert(0, ".")
from app.core.database import init_db, get_db

PRODUCTS = [
    ("Copper Wire Spool 1kg", "EC001", "Electronics Components", 450, 350, "kg", 50, 10),
    ("Resistor Pack 1000pcs", "EC002", "Electronics Components", 120, 80, "pcs", 200, 50),
    ("LED Strip 5m", "EC003", "Electronics Components", 280, 200, "pcs", 80, 20),
    ("Solder Paste 100g", "EC004", "Electronics Components", 350, 250, "pcs", 40, 10),
    ("Circuit Board Type-A", "EC005", "Electronics Components", 180, 120, "pcs", 150, 30),
    ("Capacitor Pack 500pcs", "EC006", "Electronics Components", 90, 60, "pcs", 300, 50),
    ("Steel Sheet 4x8ft", "RM001", "Raw Materials", 2500, 2000, "pcs", 25, 5),
    ("Aluminium Rod 1m", "RM002", "Raw Materials", 180, 130, "pcs", 100, 20),
    ("Plastic Granules 25kg", "RM003", "Raw Materials", 1200, 900, "kg", 40, 10),
    ("Rubber Sheet 1m2", "RM004", "Raw Materials", 350, 250, "pcs", 60, 15),
    ("Glass Panel 30x30cm", "RM005", "Raw Materials", 220, 160, "pcs", 45, 10),
    ("Wood Plank 2m", "RM006", "Raw Materials", 180, 120, "pcs", 70, 15),
    ("Bubble Wrap Roll 50m", "PK001", "Packaging", 350, 250, "pcs", 30, 5),
    ("Carton Box Small", "PK002", "Packaging", 15, 8, "pcs", 500, 100),
    ("Carton Box Large", "PK003", "Packaging", 35, 20, "pcs", 300, 50),
    ("Packing Tape 100m", "PK004", "Packaging", 45, 30, "pcs", 200, 30),
    ("Foam Sheet Pack", "PK005", "Packaging", 120, 80, "pcs", 100, 20),
    ("Stretch Film Roll", "PK006", "Packaging", 180, 120, "pcs", 50, 10),
    ("Drill Machine", "TL001", "Tools", 3500, 2800, "pcs", 10, 2),
    ("Screwdriver Set 12pc", "TL002", "Tools", 450, 300, "pcs", 25, 5),
    ("Measuring Tape 5m", "TL003", "Tools", 120, 80, "pcs", 40, 10),
    ("Wire Cutter", "TL004", "Tools", 250, 180, "pcs", 20, 5),
    ("Safety Goggles", "TL005", "Tools", 150, 100, "pcs", 50, 10),
    ("Work Gloves Pair", "TL006", "Tools", 80, 50, "pcs", 100, 20),
    ("A4 Paper Ream", "OF001", "Office Supplies", 250, 180, "pcs", 50, 10),
    ("Printer Ink Cartridge", "OF002", "Office Supplies", 800, 600, "pcs", 20, 5),
    ("Sticky Notes Pack", "OF003", "Office Supplies", 45, 30, "pcs", 100, 20),
    ("Pen Box 50pcs", "OF004", "Office Supplies", 350, 250, "pcs", 30, 5),
    ("File Folder Pack 10", "OF005", "Office Supplies", 120, 80, "pcs", 60, 10),
    ("Whiteboard Marker Set", "OF006", "Office Supplies", 90, 60, "pcs", 40, 10),
]

SUPPLIERS = [
    ("Apex Industrial Supply", "Apex Corp", "9876550001", "apex@example.com", "22AAAAA0000A1Z5"),
    ("Metro Components Ltd", "Metro Ltd", "9876550002", "metro@example.com", "22BBBBB0000B1Z5"),
    ("Greenfield Materials", "Greenfield", "9876550003", "green@example.com", "22CCCCC0000C1Z5"),
]

async def seed():
    await init_db()
    db = await get_db()
    if await db.products.count_documents({}) > 0:
        print("Data exists"); return

    supplier_ids = []
    for name, company, phone, email, gstin in SUPPLIERS:
        r = await db.suppliers.insert_one({"name": name, "company": company, "phone": phone, "email": email, "gstin": gstin, "is_active": True})
        supplier_ids.append(str(r.inserted_id))

    product_ids = []
    for name, sku, cat, sell, cost, unit, stock, min_s in PRODUCTS:
        loc = {"aisle": chr(65 + random.randint(0, 4)), "shelf": str(random.randint(1, 5)), "bin": str(random.randint(1, 10))}
        r = await db.products.insert_one({"name": name, "sku": sku, "barcode": f"WH{sku}", "category": cat, "selling_price": sell,
            "cost_price": cost, "unit": unit, "current_stock": stock, "min_stock": min_s, "max_stock": stock * 3,
            "location": loc, "is_active": True})
        product_ids.append({"id": str(r.inserted_id), "name": name, "sku": sku, "cost": cost})

    now = datetime.now(timezone.utc)
    admin = await db.users.find_one({"role": "admin"})
    admin_id = str(admin["_id"]) if admin else ""
    for i in range(40):
        p = random.choice(product_ids)
        t = random.choice(["in", "in", "in", "out", "out", "adjustment"])
        qty = random.randint(5, 50) if t != "adjustment" else random.randint(-5, 10)
        await db.stock_movements.insert_one({
            "type": t, "product_id": p["id"], "product_name": p["name"], "product_sku": p["sku"],
            "quantity": abs(qty), "unit_price": p["cost"] if t == "in" else 0,
            "supplier_id": random.choice(supplier_ids) if t == "in" else None,
            "reason": {"in": "Purchase", "out": "Dispatch", "adjustment": random.choice(["Damage", "Count correction", "Return"])}[t],
            "notes": "", "created_by": admin_id, "created_at": now - timedelta(days=random.randint(0, 13), hours=random.randint(0, 8)),
        })

    print(f"Seeded: {len(SUPPLIERS)} suppliers, {len(PRODUCTS)} products, 40 stock movements")

asyncio.run(seed())
