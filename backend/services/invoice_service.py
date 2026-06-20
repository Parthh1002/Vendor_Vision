from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Invoice, PurchaseOrder, Quotation, User
from schemas import InvoiceCreate
import datetime

def get_invoices(db: Session, current_user: User):
    """Retrieve invoices. Vendors only see invoices for their own POs."""
    if current_user.role == "vendor":
        return db.query(Invoice).join(Invoice.purchase_order).join(PurchaseOrder.quotation).filter(
            Quotation.vendor_id == current_user.vendor_id
        ).all()
    return db.query(Invoice).all()

def get_invoice(db: Session, invoice_id: int):
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()

def get_invoice_by_number(db: Session, invoice_number: str):
    return db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()

def create_invoice(db: Session, invoice_in: InvoiceCreate, vendor_id: int):
    # Verify PO exists
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == invoice_in.purchase_order_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    # Ensure PO is approved
    if po.status != "Approved":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot invoice. Purchase Order is in status '{po.status}', must be 'Approved'"
        )

    # Ensure this PO belongs to the submitting vendor
    if po.quotation.vendor_id != vendor_id:
        raise HTTPException(
            status_code=403, 
            detail="Unauthorized: This Purchase Order was issued to another vendor."
        )

    # Check for duplicate invoice number
    dup = get_invoice_by_number(db, invoice_in.invoice_number)
    if dup:
        raise HTTPException(
            status_code=400,
            detail=f"Invoice number '{invoice_in.invoice_number}' already exists in system"
        )

    db_invoice = Invoice(
        invoice_number=invoice_in.invoice_number,
        purchase_order_id=invoice_in.purchase_order_id,
        amount=invoice_in.amount,
        due_date=invoice_in.due_date,
        file_path=invoice_in.file_path,
        status="Pending"
    )
    
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

def update_invoice_status(db: Session, invoice_id: int, invoice_status: str):
    invoice = get_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = invoice_status
    if invoice_status == "Paid":
        invoice.paid_at = datetime.datetime.utcnow()
    else:
        invoice.paid_at = None
        
    db.commit()
    db.refresh(invoice)
    return invoice
