from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import Vendor
from schemas import VendorCreate

def get_vendors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Vendor).offset(skip).limit(limit).all()

def get_vendor(db: Session, vendor_id: int):
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()

def get_vendor_by_email(db: Session, email: str):
    return db.query(Vendor).filter(Vendor.email == email).first()

def create_vendor(db: Session, vendor_in: VendorCreate):
    db_vendor = Vendor(
        name=vendor_in.name,
        contact_person=vendor_in.contact_person,
        email=vendor_in.email,
        phone=vendor_in.phone,
        address=vendor_in.address,
        category=vendor_in.category,
        gst_number=vendor_in.gst_number
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

def search_vendors(db: Session, query: str = None, category: str = None):
    q = db.query(Vendor)
    if category:
        q = q.filter(Vendor.category == category)
    if query:
        search_filter = or_(
            Vendor.name.ilike(f"%{query}%"),
            Vendor.contact_person.ilike(f"%{query}%"),
            Vendor.email.ilike(f"%{query}%")
        )
        q = q.filter(search_filter)
    return q.all()
