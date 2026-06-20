from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import User, Vendor
from schemas import UserLogin, UserCreate, UserResponse, Token
from utils.hash import hash_password, verify_password
from auth import create_access_token, get_current_user, require_roles, FIREBASE_ACTIVE, firebase_auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Look up user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token payload
    token_payload = {
        "sub": user.email,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "vendor_id": user.vendor_id
    }
    
    access_token = create_access_token(data=token_payload)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "vendor_id": user.vendor_id
    }

@router.post("/register", response_model=UserResponse)
def register(
    user_in: UserCreate, 
    db: Session = Depends(get_db)
):
    """Register a new user in the ERP system (public route)."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Auto-create Vendor record if registering as a vendor and no vendor_id is given
    vendor_id = user_in.vendor_id
    if user_in.role == "vendor" and not vendor_id:
        new_vendor = Vendor(
            name=f"{user_in.name} Enterprises",
            contact_person=user_in.name,
            email=user_in.email,
            phone=user_in.phone or "N/A",
            address="Registered via Online Portal",
            category="General Goods",
            gst_number="GST-TEMP-REG",
            performance_score=90.0,
            average_delivery_time=5,
            reliability_rating=4.5
        )
        db.add(new_vendor)
        db.commit()
        db.refresh(new_vendor)
        vendor_id = new_vendor.id

    db_user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        name=user_in.name,
        role=user_in.role,
        phone=user_in.phone,
        vendor_id=vendor_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

class FirebaseLoginRequest(BaseModel):
    id_token: str
    name: Optional[str] = None
    role: Optional[str] = "vendor"

@router.post("/firebase-login", response_model=Token)
def firebase_login(login_data: FirebaseLoginRequest, db: Session = Depends(get_db)):
    """Verifies Firebase ID token, registers user in local SQLite if missing, and returns local JWT token."""
    id_token = login_data.id_token
    
    # 1. Verify Firebase ID Token
    decoded_token = None
    if FIREBASE_ACTIVE and firebase_auth:
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Firebase token verification failed: {e}",
            )
    else:
        # Mock testing fallback for local development when Firebase Admin is not initialized
        if id_token.startswith("mock_token_"):
            email = id_token.replace("mock_token_", "")
            decoded_token = {
                "email": email,
                "name": login_data.name or email.split("@")[0],
                "role": login_data.role or "vendor"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Firebase Admin is not active on the backend. Use mock_token_<email> for local testing.",
            )

    email = decoded_token.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token payload missing email",
        )

    # 2. Check if user exists in SQLite DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        name = decoded_token.get("name") or login_data.name or email.split("@")[0]
        role = decoded_token.get("role") or login_data.role or "vendor"
        
        # Check if we have a vendor to map to if the role is vendor
        vendor_id = None
        if role == "vendor":
            # Auto-create Vendor record or map to default
            new_vendor = Vendor(
                name=f"{name} Enterprises",
                contact_person=name,
                email=email,
                phone="N/A",
                address="Registered via Firebase Sync",
                category="General Goods",
                gst_number="GST-TEMP-REG",
                performance_score=90.0,
                average_delivery_time=5,
                reliability_rating=4.5
            )
            db.add(new_vendor)
            db.commit()
            db.refresh(new_vendor)
            vendor_id = new_vendor.id
            
        user = User(
            email=email,
            password_hash=hash_password("firebase_authenticated_user_placeholder_pwd"),
            name=name,
            role=role,
            vendor_id=vendor_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 3. Create local JWT access token
    token_payload = {
        "sub": user.email,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "vendor_id": user.vendor_id
    }
    access_token = create_access_token(data=token_payload)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "vendor_id": user.vendor_id
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details of the logged-in user."""
    return current_user
