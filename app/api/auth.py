"""
Authentication API endpoints for MVP.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt
from passlib.context import CryptContext

from app.config import settings

router = APIRouter()

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = settings.SECRET_KEY or "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mock users database (in production, use a real database)
MOCK_USERS = {
    "admin@advocacia.com": {
        "id": "1",
        "email": "admin@advocacia.com",
        "hashed_password": pwd_context.hash("admin123"),
        "nome": "Administrador",
        "role": "admin",
        "is_active": True
    },
    "recepcionista@advocacia.com": {
        "id": "2", 
        "email": "recepcionista@advocacia.com",
        "hashed_password": pwd_context.hash("recep123"),
        "nome": "Recepcionista",
        "role": "recepcionista",
        "is_active": True
    }
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class User(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    
    class Config:
        populate_by_name = True


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user with email and password."""
    user = MOCK_USERS.get(email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user data."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = MOCK_USERS.get(email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest):
    """Login endpoint."""
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    # Return user data without password
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "name": user["nome"],  # Mapping nome to name for frontend compatibility
        "role": user["role"],
        "is_active": user["is_active"]
    }
    
    return AuthResponse(token=access_token, user=user_data)


@router.post("/logout")
async def logout(current_user: dict = Depends(verify_token)):
    """Logout endpoint."""
    return {"message": "Logout realizado com sucesso"}


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(verify_token)):
    """Refresh token endpoint."""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user["email"]}, expires_delta=access_token_expires
    )
    
    return {"token": access_token}


@router.get("/me", response_model=User)
async def get_current_user(current_user: dict = Depends(verify_token)):
    """Get current user information."""
    return User(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["nome"],
        role=current_user["role"],
        is_active=current_user["is_active"]
    )