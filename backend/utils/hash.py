import hashlib

SALT = "vendorvision_secure_salt_2026"

def hash_password(password: str) -> str:
    """Hash password using SHA256 with a fixed salt."""
    return hashlib.sha256((password + SALT).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password by checking its hash."""
    return hash_password(plain_password) == hashed_password
