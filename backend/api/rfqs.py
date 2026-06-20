from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import RFQCreate, RFQResponse, RFQStatusUpdate
from auth import get_current_user, require_roles
from services import rfq_service

router = APIRouter(prefix="/api/rfqs", tags=["rfqs"])

@router.get("", response_model=List[RFQResponse])
def read_rfqs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List RFQs. Filters out uninvited RFQs for vendors."""
    return rfq_service.get_rfqs(db, current_user=current_user)

@router.get("/{rfq_id}", response_model=RFQResponse)
def read_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific RFQ. Validates vendor access permissions."""
    rfq = rfq_service.get_rfq(db, rfq_id=rfq_id)
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found"
        )
        
    # Enforce security boundary for vendors
    if current_user.role == "vendor":
        invited_ids = [v.id for v in rfq.vendors]
        if current_user.vendor_id not in invited_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not invited to view this RFQ."
            )
            
    return rfq

@router.post("", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def create_draft_rfq(
    rfq_in: RFQCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer"]))
):
    """Create a draft RFQ. Restricted to Admin and Procurement Officers."""
    return rfq_service.create_rfq(db, rfq_in=rfq_in, creator_id=current_user.id)

@router.post("/{rfq_id}/publish", response_model=RFQResponse)
def publish_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer"]))
):
    """Publish a draft RFQ, making it visible to invited vendors."""
    rfq = rfq_service.get_rfq(db, rfq_id=rfq_id)
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found"
        )
    if rfq.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"RFQ cannot be published. Current status is '{rfq.status}', expected 'Draft'."
        )
    return rfq_service.publish_rfq(db, rfq_id=rfq_id)

@router.put("/{rfq_id}/status", response_model=RFQResponse)
def update_rfq_status(
    rfq_id: int,
    status_update: RFQStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer", "manager"]))
):
    """Manually update an RFQ status."""
    rfq = rfq_service.get_rfq(db, rfq_id=rfq_id)
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFQ not found"
        )
    return rfq_service.update_rfq_status(db, rfq_id=rfq_id, status=status_update.status)
