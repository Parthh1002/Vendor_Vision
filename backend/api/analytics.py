from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SpendAnalyticsResponse
from auth import require_roles
from services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("", response_model=SpendAnalyticsResponse)
def read_spend_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "procurement_officer", "manager"]))
):
    """Retrieve executive spend dashboard metrics. Restricted to internal staff."""
    return analytics_service.get_spend_analytics(db)
