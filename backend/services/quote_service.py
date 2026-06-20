from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Quotation, RFQ, User, Vendor
from schemas import QuotationCreate
import datetime

def get_quotes(db: Session, current_user: User):
    """Retrieve quotations. Vendors only see their own submissions."""
    if current_user.role == "vendor":
        return db.query(Quotation).filter(Quotation.vendor_id == current_user.vendor_id).all()
    return db.query(Quotation).all()

def get_quote(db: Session, quote_id: int):
    return db.query(Quotation).filter(Quotation.id == quote_id).first()

def get_quotes_for_rfq(db: Session, rfq_id: int):
    return db.query(Quotation).filter(Quotation.rfq_id == rfq_id).all()

def submit_quote(db: Session, quote_in: QuotationCreate, vendor_id: int):
    # Verify RFQ exists and is open
    rfq = db.query(RFQ).filter(RFQ.id == quote_in.rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    if rfq.status != "Published":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot submit quotation. RFQ status is '{rfq.status}', must be 'Published'"
        )
        
    if rfq.deadline < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot submit quotation. RFQ deadline has passed.")

    # Check if vendor already submitted a quote for this RFQ
    existing_quote = db.query(Quotation).filter(
        Quotation.rfq_id == quote_in.rfq_id,
        Quotation.vendor_id == vendor_id
    ).first()
    
    if existing_quote:
        # Update existing quote instead of creating new one
        existing_quote.price = quote_in.price
        existing_quote.delivery_days = quote_in.delivery_days
        existing_quote.specs = quote_in.specs
        existing_quote.terms = quote_in.terms
        existing_quote.submitted_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing_quote)
        return existing_quote

    db_quote = Quotation(
        rfq_id=quote_in.rfq_id,
        vendor_id=vendor_id,
        price=quote_in.price,
        delivery_days=quote_in.delivery_days,
        specs=quote_in.specs,
        terms=quote_in.terms,
        status="Submitted"
    )
    db.add(db_quote)
    
    # Update RFQ status to 'Under Review' if we receive quotes
    if rfq.status == "Published":
        rfq.status = "Published" # Keep as published, but UI can show quotes submitted
        
    db.commit()
    db.refresh(db_quote)
    return db_quote

def evaluate_and_accept_quote(db: Session, quote_id: int):
    """Accept the winning quotation and reject all others for the same RFQ."""
    quote = get_quote(db, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    rfq = db.query(RFQ).filter(RFQ.id == quote.rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="Associated RFQ not found")
        
    # Accept this quote
    quote.status = "Accepted"
    
    # Reject other quotes for the same RFQ
    other_quotes = db.query(Quotation).filter(
        Quotation.rfq_id == rfq.id,
        Quotation.id != quote_id
    ).all()
    
    for oq in other_quotes:
        oq.status = "Rejected"
        
    # Set RFQ status
    rfq.status = "Under Review"
    
    db.commit()
    db.refresh(quote)
    return quote
