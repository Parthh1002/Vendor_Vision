from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import CopilotMessageRequest, CopilotMessageResponse
from auth import get_current_user
from services import copilot_service

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

@router.post("/query", response_model=CopilotMessageResponse)
def query_ai_assistant(
    request: CopilotMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Query the AI Copilot. Gathers active DB context and returns insights/recommendations."""
    return copilot_service.query_copilot(db, user_id=current_user.id, message=request.message)
