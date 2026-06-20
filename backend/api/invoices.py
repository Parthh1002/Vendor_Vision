from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import InvoiceCreate, InvoiceResponse, InvoiceStatusUpdate
from auth import get_current_user, require_roles
from services import invoice_service

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

@router.get("", response_model=List[InvoiceResponse])
def read_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve invoices. Vendors are filtered to invoices matching their sales."""
    return invoice_service.get_invoices(db, current_user=current_user)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific invoice."""
    invoice = invoice_service.get_invoice(db, invoice_id=invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
        
    # Enforce vendor boundary
    if current_user.role == "vendor" and invoice.purchase_order.quotation.vendor_id != current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You are not authorized to view this invoice."
        )
        
    return invoice

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def submit_new_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["vendor"]))
):
    """Submit a new invoice against an approved Purchase Order. Restricted to Vendors."""
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your user account is not linked to any active Vendor profile."
        )
    return invoice_service.create_invoice(db, invoice_in=invoice_in, vendor_id=current_user.vendor_id)

@router.post("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_payment_status(
    invoice_id: int,
    status_update: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager"]))
):
    """Update invoice status (Approved, Paid, Overdue). Restricted to Admin and Managers."""
    return invoice_service.update_invoice_status(db, invoice_id=invoice_id, invoice_status=status_update.status)
