from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import QuotationCreate, QuotationResponse
from auth import get_current_user, require_roles
from services import rfq_service, quote_service

router = APIRouter(prefix="/api/quotes", tags=["quotes"])

@router.get("", response_model=List[QuotationResponse])
def read_quotes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve list of quotations. Vendors are restricted to their own bids."""
    return quote_service.get_quotes(db, current_user=current_user)

@router.get("/rfq/{rfq_id}", response_model=List[QuotationResponse])
def read_quotes_by_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all quotations submitted for a specific RFQ. Vendors cannot access other vendors' pricing."""
    if current_user.role == "vendor":
        # Check if vendor is invited to this RFQ
        rfq = rfq_service.get_rfq(db, rfq_id=rfq_id)
        if not rfq:
            raise HTTPException(status_code=404, detail="RFQ not found")
        
        invited_ids = [v.id for v in rfq.vendors]
        if current_user.vendor_id not in invited_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not invited to this RFQ."
            )
            
        # Return only current vendor's quote
        quotes = quote_service.get_quotes_for_rfq(db, rfq_id=rfq_id)
        return [q for q in quotes if q.vendor_id == current_user.vendor_id]
        
    return quote_service.get_quotes_for_rfq(db, rfq_id=rfq_id)

@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def submit_quotation(
    quote_in: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["vendor"]))
):
    """Submit a quotation. Restricted to Vendor accounts."""
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your user account is not linked to any active Vendor profile."
        )
    return quote_service.submit_quote(db, quote_in=quote_in, vendor_id=current_user.vendor_id)

@router.post("/{quote_id}/accept", response_model=QuotationResponse)
def accept_quotation(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer"]))
):
    """Accept a quotation and reject other submissions for the same RFQ."""
    return quote_service.evaluate_and_accept_quote(db, quote_id=quote_id)
