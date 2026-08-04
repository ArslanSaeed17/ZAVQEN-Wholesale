from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Address, CartItem, Order, OrderItem, Product, User
from schemas import AddressIn, AddressOut, CheckoutIn, OrderOut
from deps import get_current_user

router = APIRouter(tags=["orders"])


# ---------------- Addresses ----------------
@router.get("/addresses", response_model=list[AddressOut])
def list_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == user.id).order_by(Address.created_at.desc()).all()


@router.post("/addresses", response_model=AddressOut, status_code=201)
def add_address(data: AddressIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    addr = Address(user_id=user.id, **data.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/addresses/{addr_id}", response_model=AddressOut)
def update_address(addr_id: str, data: AddressIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(Address).filter(Address.id == addr_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(404, "Address not found.")
    if data.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    for k, v in data.model_dump().items():
        setattr(addr, k, v)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/addresses/{addr_id}", status_code=204)
def delete_address(addr_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(Address).filter(Address.id == addr_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(404, "Address not found.")
    db.delete(addr)
    db.commit()


# ---------------- Orders / Checkout ----------------
@router.post("/orders/checkout", response_model=OrderOut, status_code=201)
def checkout(data: CheckoutIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_items = db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(400, "Your cart is empty.")

    # resolve shipping details — either a saved address or a one-off address
    if data.address_id:
        addr = db.query(Address).filter(Address.id == data.address_id, Address.user_id == user.id).first()
        if not addr:
            raise HTTPException(404, "Address not found.")
        ship = dict(
            full_name=addr.full_name, phone=addr.phone, line1=addr.line1, line2=addr.line2,
            city=addr.city, state=addr.state, postal_code=addr.postal_code, country=addr.country,
        )
    else:
        required = [data.full_name, data.phone, data.line1, data.city]
        if not all(required):
            raise HTTPException(400, "Full shipping address is required.")
        ship = dict(
            full_name=data.full_name, phone=data.phone, line1=data.line1, line2=data.line2,
            city=data.city, state=data.state, postal_code=data.postal_code, country=data.country or "Pakistan",
        )

    # revalidate every line server-side — never trust cart quantities blindly.
    # This whole function runs in one DB transaction: either every check
    # passes and the order + stock decrement + cart clear all commit together,
    # or nothing does.
    try:
        subtotal = 0
        order_items_data = []
        for ci in cart_items:
            product = db.query(Product).filter(Product.id == ci.product_id).with_for_update().first()
            if not product or not product.is_active:
                raise HTTPException(400, f"'{ci.product.name}' is no longer available.")
            if ci.quantity < product.moq:
                raise HTTPException(400, f"'{product.name}' requires a minimum order of {product.moq}.")
            if ci.quantity > product.stock:
                raise HTTPException(400, f"Only {product.stock} of '{product.name}' left in stock.")

            line_total = float(product.price) * ci.quantity
            subtotal += line_total
            order_items_data.append((product, ci.quantity, line_total))
            product.stock -= ci.quantity  # decrement stock now, inside the same transaction

        order = Order(
            user_id=user.id, status="pending", payment_method=data.payment_method,
            subtotal=subtotal, shipping_full_name=ship["full_name"], shipping_phone=ship["phone"],
            shipping_address_line1=ship["line1"], shipping_address_line2=ship["line2"],
            shipping_city=ship["city"], shipping_state=ship["state"],
            shipping_postal_code=ship["postal_code"], shipping_country=ship["country"],
        )
        db.add(order)
        db.flush()  # get order.id without committing yet

        for product, qty, line_total in order_items_data:
            db.add(OrderItem(
                order_id=order.id, product_id=product.id, product_name=product.name,
                unit_price=product.price, quantity=qty, line_total=line_total,
            ))

        for ci in cart_items:
            db.delete(ci)

        db.commit()
        db.refresh(order)
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(500, "Couldn't place order. Please try again.")


@router.get("/orders", response_model=list[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Order).options(joinedload(Order.items)).filter(
        Order.user_id == user.id
    ).order_by(Order.created_at.desc()).all()


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order or (order.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Order not found.")
    return order
