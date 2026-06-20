from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import PurchaseOrder, Quotation, RFQ, User, ApprovalLog, Vendor
from schemas import PurchaseOrderCreate, PurchaseOrderApproval
import datetime

def get_purchase_orders(db: Session, current_user: User):
    """Retrieve POs. Vendors only see POs matching their quotes."""
    if current_user.role == "vendor":
        return db.query(PurchaseOrder).join(PurchaseOrder.quotation).filter(
            Quotation.vendor_id == current_user.vendor_id
        ).all()
    return db.query(PurchaseOrder).all()

def get_purchase_order(db: Session, po_id: int):
    return db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()

def get_purchase_order_by_number(db: Session, po_number: str):
    return db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_number).first()

def create_po_from_quote(db: Session, quote_id: int, creator_id: int):
    # Verify quotation exists
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    # Check if a PO already exists for this quotation
    existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.quotation_id == quote_id).first()
    if existing_po:
        raise HTTPException(status_code=400, detail="Purchase Order already exists for this quotation")

    # Force accept the quote
    quote.status = "Accepted"
    
    # Reject other quotes for the same RFQ
    rfq = db.query(RFQ).filter(RFQ.id == quote.rfq_id).first()
    if rfq:
        rfq.status = "PO Generated"
        other_quotes = db.query(Quotation).filter(
            Quotation.rfq_id == rfq.id,
            Quotation.id != quote_id
        ).all()
        for oq in other_quotes:
            oq.status = "Rejected"

    # Generate PO Number
    year = datetime.datetime.utcnow().year
    count = db.query(PurchaseOrder).count() + 1
    po_number = f"PO-{year}-{count:04d}"

    # Create Purchase Order
    db_po = PurchaseOrder(
        po_number=po_number,
        quotation_id=quote_id,
        amount=quote.price,
        status="Pending Approval", # Needs manager approval by default
        approval_status="Pending",
        created_by_id=creator_id
    )
    
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    return db_po

def approve_po(db: Session, po_id: int, approver_id: int, approval: PurchaseOrderApproval):
    db_po = get_purchase_order(db, po_id)
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    if db_po.approval_status != "Pending":
        raise HTTPException(status_code=400, detail=f"Purchase Order is already {db_po.approval_status}")
        
    # Set approval details
    db_po.approval_status = approval.action # Approved or Rejected
    db_po.approved_by_id = approver_id
    
    if approval.action == "Approved":
        db_po.status = "Approved" # Approved status movesPO to active state
    else:
        db_po.status = "Rejected"

    # Log the action
    log = ApprovalLog(
        purchase_order_id=po_id,
        approver_id=approver_id,
        action=approval.action,
        comments=approval.comments
    )
    db.add(log)
    
    db.commit()
    db.refresh(db_po)
    return db_po
