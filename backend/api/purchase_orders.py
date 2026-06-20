from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderApproval
from auth import get_current_user, require_roles
from services import po_service

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])

@router.get("", response_model=List[PurchaseOrderResponse])
def read_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List Purchase Orders. Filters to corresponding POs for vendors."""
    return po_service.get_purchase_orders(db, current_user=current_user)

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def read_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific PO, verifying access boundaries."""
    po = po_service.get_purchase_order(db, po_id=po_id)
    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found"
        )
        
    # Enforce vendor security boundary
    if current_user.role == "vendor" and po.quotation.vendor_id != current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You are not authorized to view this Purchase Order."
        )
        
    return po

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def generate_po_from_quotation(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer"]))
):
    """Generate a Purchase Order from an accepted quotation."""
    return po_service.create_po_from_quote(db, quote_id=po_in.quotation_id, creator_id=current_user.id)

@router.post("/{po_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    po_id: int,
    approval: PurchaseOrderApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "manager"]))
):
    """Approve or reject a Purchase Order. Restricted to Manager and Admin roles."""
    return po_service.approve_po(db, po_id=po_id, approver_id=current_user.id, approval=approval)
