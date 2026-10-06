from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, oauth2_scheme, decode_token
from app.models.models import User
from app.schemas.schemas import Token, LoginRequest, UserResponse, ChangePasswordRequest, UserCreateRequest

router = APIRouter(prefix="/auth", tags=["Autenticación"])

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador para esta acción"
        )
    return current_user

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_email": user.email,
        "role": user.role
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta"
        )
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}

@router.get("/users", response_model=List[UserResponse])
def get_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()

@router.post("/users", response_model=UserResponse)
def create_user(request: UserCreateRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario registrado con el correo {request.email}"
        )
    new_user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name or "Usuario del Sistema",
        role=request.role or "admin",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

