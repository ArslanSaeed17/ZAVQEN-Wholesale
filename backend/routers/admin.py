import os
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Product, Category, Order, User, SiteSetting, ContactMessage
from schemas import (
    ProductIn, ProductOut, CategoryIn, CategoryOut, OrderOut, OrderStatusUpdateIn,
    AdminCustomerOut, AdminDashboardOut, SiteSettingsIn, ContactMessageOut,
)
from deps import require_admin
from config import settings
from routers.catalog import _to_product_out

router = APIRouter(prefix="/admin", tags=["admin"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024


# ---------------- Dashboard ----------------
@router.get("/dashboard", response_model=AdminDashboardOut)
def dashboard(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    product_count = db.query(func.count(Product.id)).scalar()
    category_count = db.query(func.count(Category.id)).scalar()
    customer_count = db.query(func.count(User.id)).filter(User.role == "customer").scalar()
    order_count = db.query(func.count(Order.id)).scalar()
    pending_count = db.query(func.count(Order.id)).filter(Order.status == "pending").scalar()
    revenue = db.query(func.coalesce(func.sum(Order.subtotal), 0)).filter(Order.status != "cancelled").scalar()
    return AdminDashboardOut(
        product_count=product_count, category_count=category_count, customer_count=customer_count,
        order_count=order_count, pending_order_count=pending_count, revenue=float(revenue),
    )


# ---------------- Products ----------------
@router.get("/products", response_model=list[ProductOut])
def admin_list_products(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    products = db.query(Product).options(joinedload(Product.category)).order_by(Product.created_at.desc()).all()
    return [_to_product_out(p) for p in products]


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(data: ProductIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Product).filter(Product.slug == data.slug).first():
        raise HTTPException(400, "That slug is already in use.")
    p = Product(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_product_out(p)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: str, data: ProductIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found.")
    dupe = db.query(Product).filter(Product.slug == data.slug, Product.id != product_id).first()
    if dupe:
        raise HTTPException(400, "That slug is already in use.")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _to_product_out(p)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found.")
    db.delete(p)
    db.commit()


# ---------------- Categories ----------------
@router.get("/categories", response_model=list[CategoryOut])
def admin_list_categories(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.name).all()
    out = []
    for c in cats:
        count = db.query(func.count(Product.id)).filter(Product.category_id == c.id).scalar()
        out.append(CategoryOut(
            id=c.id, name=c.name, slug=c.slug, description=c.description,
            image_url=c.image_url, product_count=count, created_at=c.created_at,
        ))
    return out


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.slug == data.slug).first():
        raise HTTPException(400, "That slug is already in use.")
    c = Category(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return CategoryOut(id=c.id, name=c.name, slug=c.slug, description=c.description,
                        image_url=c.image_url, product_count=0, created_at=c.created_at)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: str, data: CategoryIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(Category).filter(Category.id == category_id).first()
    if not c:
        raise HTTPException(404, "Category not found.")
    dupe = db.query(Category).filter(Category.slug == data.slug, Category.id != category_id).first()
    if dupe:
        raise HTTPException(400, "That slug is already in use.")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    count = db.query(func.count(Product.id)).filter(Product.category_id == c.id).scalar()
    return CategoryOut(id=c.id, name=c.name, slug=c.slug, description=c.description,
                        image_url=c.image_url, product_count=count, created_at=c.created_at)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(Category).filter(Category.id == category_id).first()
    if not c:
        raise HTTPException(404, "Category not found.")
    db.query(Product).filter(Product.category_id == category_id).update({"category_id": None})
    db.delete(c)
    db.commit()


# ---------------- Orders ----------------
@router.get("/orders", response_model=list[OrderOut])
def admin_list_orders(status: Optional[str] = None, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc())
    if status:
        q = q.filter(Order.status == status)
    return q.all()


@router.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: str, data: OrderStatusUpdateIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found.")
    order.status = data.status
    db.commit()
    db.refresh(order)
    return order


# ---------------- Customers ----------------
@router.get("/customers", response_model=list[AdminCustomerOut])
def admin_list_customers(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    customers = db.query(User).filter(User.role == "customer").order_by(User.created_at.desc()).all()
    out = []
    for c in customers:
        stats = db.query(
            func.count(Order.id),
            func.coalesce(func.sum(Order.subtotal).filter(Order.status != "cancelled"), 0),
        ).filter(Order.user_id == c.id).first()
        out.append(AdminCustomerOut(
            id=c.id, full_name=c.full_name, phone=c.phone, created_at=c.created_at,
            order_count=stats[0] or 0, total_spent=float(stats[1] or 0),
        ))
    return out


# ---------------- Site settings ----------------
@router.put("/settings")
def update_settings(data: SiteSettingsIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    for key, value in data.model_dump(exclude_none=True).items():
        row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if row:
            row.value = value
        else:
            db.add(SiteSetting(key=key, value=value))
    db.commit()
    return {"message": "Settings saved."}


# ---------------- Contact messages ----------------
@router.get("/messages", response_model=list[ContactMessageOut])
def admin_list_messages(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(50).all()


@router.delete("/messages/{message_id}", status_code=204)
def delete_message(message_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Message not found.")
    db.delete(msg)
    db.commit()


# ---------------- Image upload ----------------
# Files are validated for type + size here on the server — the same checks
# the frontend does are re-checked because the frontend check can always be
# bypassed by calling this endpoint directly.
@router.post("/upload")
async def upload_image(folder: str = "products", file: UploadFile = File(...), _: User = Depends(require_admin)):
    if folder not in ("products", "categories"):
        folder = "products"
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Unsupported image type. Use JPG, PNG, WEBP, or GIF.")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(400, "Image is larger than 5MB.")

    safe_name = re.sub(r"[^a-zA-Z0-9.]", "-", file.filename or "image")
    filename = f"{uuid.uuid4().hex}-{safe_name}"
    folder_path = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    with open(os.path.join(folder_path, filename), "wb") as f:
        f.write(contents)

    url = f"{settings.public_base_url}/uploads/{folder}/{filename}"
    return {"url": url}
