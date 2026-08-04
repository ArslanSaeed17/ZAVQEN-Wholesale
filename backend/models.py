import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, ForeignKey, DateTime, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="customer")  # 'customer' | 'admin'
    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(String, nullable=False, default="Shipping")
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    line1 = Column(String, nullable=False)
    line2 = Column(String, nullable=True)
    city = Column(String, nullable=False)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=False, default="Pakistan")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    sku = Column(String, nullable=True)
    category_id = Column(UUID(as_uuid=False), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    moq = Column(Integer, nullable=False, default=1)
    stock = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    images = Column(JSON, nullable=False, default=list)  # list[str] of image URLs
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending/processing/shipped/delivered/cancelled
    payment_method = Column(String, nullable=False)  # cod | bank_transfer
    subtotal = Column(Numeric(12, 2), nullable=False)

    shipping_full_name = Column(String, nullable=False)
    shipping_phone = Column(String, nullable=False)
    shipping_address_line1 = Column(String, nullable=False)
    shipping_address_line2 = Column(String, nullable=True)
    shipping_city = Column(String, nullable=False)
    shipping_state = Column(String, nullable=True)
    shipping_postal_code = Column(String, nullable=True)
    shipping_country = Column(String, nullable=False, default="Pakistan")

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    order_id = Column(UUID(as_uuid=False), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
