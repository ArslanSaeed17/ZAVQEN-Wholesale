import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from config import settings
from routers import auth, catalog, cart, orders, admin, public

# import models so Base.metadata knows about every table before create_all
import models  # noqa: F401

app = FastAPI(title="ZAVQEN Wholesale API")

origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(public.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # seed default site_settings rows if missing
    from database import SessionLocal
    from models import SiteSetting
    db = SessionLocal()
    try:
        defaults = {
            "whatsapp_number": "", "contact_email": "", "contact_phone": "", "contact_address": "Lahore, Pakistan",
        }
        for key, value in defaults.items():
            if not db.query(SiteSetting).filter(SiteSetting.key == key).first():
                db.add(SiteSetting(key=key, value=value))
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "service": "ZAVQEN Wholesale API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
