from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.schemas.user import UserCreate, UserOut, UserLogin, TokenResponse, UpdateRegionRequest
from src.services.auth_service import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    RegionNotFoundError,
)
from src.dependencies import get_current_user
from src.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        new_user = service.register_user(user_data)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        token = service.login_user(credentials.email, credentials.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return TokenResponse(access_token=token)

@router.put("/me/region", response_model=UserOut)
def update_region(
    request: UpdateRegionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AuthService(db)
    try:
        updated_user = service.update_user_region(current_user.user_id, request.region_id)
    except RegionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified region does not exist.",
        )
    return updated_user

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user