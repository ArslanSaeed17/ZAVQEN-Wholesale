from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import CartItem, Product, User
from schemas import CartItemIn, CartItemUpdateIn, CartItemOut
from deps import get_current_user
from routers.catalog import _to_product_out

router = APIRouter(prefix="/cart", tags=["cart"])


def _to_cart_out(c: CartItem) -> CartItemOut:
    return CartItemOut(id=c.id, product_id=c.product_id, quantity=c.quantity, product=_to_product_out(c.product))


@router.get("", response_model=list[CartItemOut])
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.user_id == user.id).all()
    return [_to_cart_out(c) for c in items]


@router.post("", response_model=CartItemOut, status_code=201)
def add_to_cart(data: CartItemIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id, Product.is_active == True).first()  # noqa: E712
    if not product:
        raise HTTPException(404, "Product not found.")
    if data.quantity < product.moq:
        raise HTTPException(400, f"Minimum order quantity for this product is {product.moq}.")
    if data.quantity > product.stock:
        raise HTTPException(400, f"Only {product.stock} in stock.")

    existing = db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.product_id == data.product_id).first()
    if existing:
        existing.quantity = data.quantity
        item = existing
    else:
        item = CartItem(user_id=user.id, product_id=data.product_id, quantity=data.quantity)
        db.add(item)
    db.commit()
    db.refresh(item)
    return _to_cart_out(item)


@router.put("/{item_id}", response_model=CartItemOut)
def update_cart_item(item_id: str, data: CartItemUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found.")
    if data.quantity < item.product.moq:
        raise HTTPException(400, f"Minimum order quantity for this product is {item.product.moq}.")
    if data.quantity > item.product.stock:
        raise HTTPException(400, f"Only {item.product.stock} in stock.")
    item.quantity = data.quantity
    db.commit()
    db.refresh(item)
    return _to_cart_out(item)


@router.delete("/{item_id}", status_code=204)
def remove_cart_item(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found.")
    db.delete(item)
    db.commit()
