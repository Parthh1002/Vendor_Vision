import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt # Requires PyJWT

from database import get_db
from models import User

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "vendorvision_super_secret_key_2026_rfq_erp")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 Hours

# Firebase Admin configuration status
FIREBASE_ACTIVE = False
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials
    
    # Try to initialize if not already initialized
    if not firebase_admin._apps:
        # 1. Try local service account key file
        service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY") or "firebase-service-account.json"
        if os.path.exists(service_account_path):
            try:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                FIREBASE_ACTIVE = True
            except Exception as e:
                print(f"Failed to initialize Firebase Admin with Certificate: {e}")
        else:
            # 2. Try default credentials initialization
            try:
                firebase_admin.initialize_app()
                FIREBASE_ACTIVE = True
            except Exception:
                pass
    else:
        FIREBASE_ACTIVE = True
except ImportError:
    firebase_auth = None

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a local JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify local JWT token or fallback to Firebase token verification."""
    # 1. Try Local JWT verification first
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        pass

    # 2. Try Firebase JWT verification if active
    if FIREBASE_ACTIVE:
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            # Standardize payload fields to match local token structure
            return {
                "sub": decoded_token.get("email"),
                "email": decoded_token.get("email"),
                "role": decoded_token.get("role", "vendor") # Default to vendor if role not in claims
            }
        except Exception:
            pass

    return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to retrieve the authenticated user from the token."""
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    email = payload.get("sub") or payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in system database",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user

# Helper to check roles (Role-Based Access Control)
def require_roles(allowed_roles: list[str]):
    """Returns a dependency check that restricts access to specified roles."""
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted to roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return dependency
