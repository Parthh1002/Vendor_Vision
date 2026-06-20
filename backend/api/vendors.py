from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User
from schemas import VendorCreate, VendorResponse
from auth import get_current_user, require_roles
from services import vendor_service

router = APIRouter(prefix="/api/vendors", tags=["vendors"])

@router.get("", response_model=List[VendorResponse])
def read_vendors(
    query: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer", "manager"]))
):
    """Retrieve vendors. Restricted to internal staff roles."""
    if query or category:
        return vendor_service.search_vendors(db, query=query, category=category)
    return vendor_service.get_vendors(db)

@router.get("/{vendor_id}", response_model=VendorResponse)
def read_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer", "manager"]))
):
    """Retrieve details for a specific vendor."""
    vendor = vendor_service.get_vendor(db, vendor_id=vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    return vendor

@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_new_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer"]))
):
    """Add a new vendor to the directory. Restricted to Admin and Procurement Officers."""
    # Check if vendor email already exists
    existing = vendor_service.get_vendor_by_email(db, email=vendor_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor with this email already exists"
        )
    return vendor_service.create_vendor(db, vendor_in=vendor_in)
