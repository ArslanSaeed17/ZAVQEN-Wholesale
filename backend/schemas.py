from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordIn(BaseModel):
    new_password: str = Field(min_length=8)


class ProfileUpdateIn(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Addresses ----------
class AddressIn(BaseModel):
    label: str = "Shipping"
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Pakistan"
    is_default: bool = False


class AddressOut(AddressIn):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Categories ----------
class CategoryIn(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class CategoryOut(CategoryIn):
    id: str
    product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Products ----------
class ProductIn(BaseModel):
    name: str
    slug: str
    sku: Optional[str] = None
    category_id: Optional[str] = None
    price: float
    moq: int = 1
    stock: int = 0
    description: Optional[str] = None
    images: List[str] = []
    is_active: bool = True


class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    sku: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    price: float
    moq: int
    stock: int
    description: Optional[str] = None
    images: List[str] = []
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProductListOut(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    page_size: int


# ---------- Cart ----------
class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class CartItemUpdateIn(BaseModel):
    quantity: int = Field(gt=0)


class CartItemOut(BaseModel):
    id: str
    product_id: str
    quantity: int
    product: ProductOut

    class Config:
        from_attributes = True


# ---------- Orders ----------
class CheckoutIn(BaseModel):
    address_id: Optional[str] = None
    # or a one-off address, used if address_id is not provided
    full_name: Optional[str] = None
    phone: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "Pakistan"
    payment_method: str = Field(pattern="^(cod|bank_transfer)$")


class OrderItemOut(BaseModel):
    id: str
    product_id: Optional[str]
    product_name: str
    unit_price: float
    quantity: int
    line_total: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: str
    status: str
    payment_method: str
    subtotal: float
    shipping_full_name: str
    shipping_phone: str
    shipping_address_line1: str
    shipping_address_line2: Optional[str] = None
    shipping_city: str
    shipping_state: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_country: str
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdateIn(BaseModel):
    status: str = Field(pattern="^(pending|processing|shipped|delivered|cancelled)$")


# ---------- Site settings ----------
class SiteSettingsIn(BaseModel):
    whatsapp_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None


# ---------- Contact ----------
class ContactMessageIn(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str


class ContactMessageOut(ContactMessageIn):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Admin ----------
class AdminCustomerOut(BaseModel):
    id: str
    full_name: str
    phone: Optional[str] = None
    created_at: datetime
    order_count: int
    total_spent: float


class AdminDashboardOut(BaseModel):
    product_count: int
    category_count: int
    customer_count: int
    order_count: int
    pending_order_count: int
    revenue: float
