from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from database import get_db
from models import Product, Category
from schemas import ProductOut, ProductListOut, CategoryOut

router = APIRouter(tags=["catalog"])


def _to_product_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id, name=p.name, slug=p.slug, sku=p.sku,
        category_id=p.category_id, category_name=p.category.name if p.category else None,
        price=float(p.price), moq=p.moq, stock=p.stock, description=p.description,
        images=p.images or [], is_active=p.is_active, created_at=p.created_at,
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.name).all()
    out = []
    for c in cats:
        count = db.query(func.count(Product.id)).filter(Product.category_id == c.id).scalar()
        out.append(CategoryOut(
            id=c.id, name=c.name, slug=c.slug, description=c.description,
            image_url=c.image_url, product_count=count, created_at=c.created_at,
        ))
    return out


@router.get("/products", response_model=ProductListOut)
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,  # category slug
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    availability: Optional[str] = Query(None, pattern="^(in|out)$"),
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|name_asc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(joinedload(Product.category)).filter(Product.is_active == True)  # noqa: E712

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category:
        q = q.join(Category).filter(Category.slug == category)
    if price_min is not None:
        q = q.filter(Product.price >= price_min)
    if price_max is not None:
        q = q.filter(Product.price <= price_max)
    if availability == "in":
        q = q.filter(Product.stock > 0)
    elif availability == "out":
        q = q.filter(Product.stock <= 0)

    total = q.count()

    if sort == "price_asc":
        q = q.order_by(Product.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Product.price.desc())
    elif sort == "name_asc":
        q = q.order_by(Product.name.asc())
    else:
        q = q.order_by(Product.created_at.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return ProductListOut(
        items=[_to_product_out(p) for p in items], total=total, page=page, page_size=page_size,
    )


@router.get("/products/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    p = db.query(Product).options(joinedload(Product.category)).filter(Product.slug == slug).first()
    if not p or not p.is_active:
        raise HTTPException(404, "Product not found.")
    return _to_product_out(p)


@router.get("/products/{slug}/related", response_model=list[ProductOut])
def related_products(slug: str, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.slug == slug).first()
    if not p:
        raise HTTPException(404, "Product not found.")
    q = db.query(Product).options(joinedload(Product.category)).filter(
        Product.is_active == True, Product.id != p.id  # noqa: E712
    )
    if p.category_id:
        q = q.filter(Product.category_id == p.category_id)
    items = q.limit(4).all()
    return [_to_product_out(x) for x in items]
