from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import SiteSetting, ContactMessage
from schemas import ContactMessageIn

router = APIRouter(tags=["public"])

DEFAULT_KEYS = ["whatsapp_number", "contact_email", "contact_phone", "contact_address"]


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(SiteSetting).all()
    result = {k: "" for k in DEFAULT_KEYS}
    result.update({r.key: r.value for r in rows})
    return result


@router.post("/contact", status_code=201)
def submit_contact(data: ContactMessageIn, db: Session = Depends(get_db)):
    if len(data.message.strip()) < 1 or len(data.name.strip()) < 1:
        raise HTTPException(400, "Name and message are required.")
    msg = ContactMessage(name=data.name.strip(), email=data.email, subject=data.subject, message=data.message.strip())
    db.add(msg)
    db.commit()
    return {"message": "Message sent."}
