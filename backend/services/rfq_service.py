from sqlalchemy.orm import Session
from models import RFQ, Vendor, User
from schemas import RFQCreate
import datetime

def get_rfqs(db: Session, current_user: User):
    """Retrieve RFQs. Vendors only see RFQs they are invited to."""
    if current_user.role == "vendor":
        if not current_user.vendor_id:
            return []
        return db.query(RFQ).join(RFQ.vendors).filter(Vendor.id == current_user.vendor_id).all()
    else:
        return db.query(RFQ).all()

def get_rfq(db: Session, rfq_id: int):
    return db.query(RFQ).filter(RFQ.id == rfq_id).first()

def get_rfq_by_number(db: Session, rfq_number: str):
    return db.query(RFQ).filter(RFQ.rfq_number == rfq_number).first()

def create_rfq(db: Session, rfq_in: RFQCreate, creator_id: int):
    # Generate unique RFQ number
    year = datetime.datetime.utcnow().year
    count = db.query(RFQ).count() + 1
    rfq_number = f"RFQ-{year}-{count:04d}"
    
    db_rfq = RFQ(
        rfq_number=rfq_number,
        title=rfq_in.title,
        description=rfq_in.description,
        budget=rfq_in.budget,
        quantity=rfq_in.quantity,
        category=rfq_in.category,
        deadline=rfq_in.deadline,
        status="Draft",
        created_by_id=creator_id
    )
    
    # Associate invited vendors
    if rfq_in.invited_vendor_ids:
        invited_vendors = db.query(Vendor).filter(Vendor.id.in_(rfq_in.invited_vendor_ids)).all()
        db_rfq.vendors.extend(invited_vendors)
        
    db.add(db_rfq)
    db.commit()
    db.refresh(db_rfq)
    return db_rfq

def publish_rfq(db: Session, rfq_id: int):
    db_rfq = get_rfq(db, rfq_id)
    if db_rfq and db_rfq.status == "Draft":
        db_rfq.status = "Published"
        db.commit()
        db.refresh(db_rfq)
    return db_rfq

def update_rfq_status(db: Session, rfq_id: int, status: str):
    db_rfq = get_rfq(db, rfq_id)
    if db_rfq:
        db_rfq.status = status
        db.commit()
        db.refresh(db_rfq)
    return db_rfq
