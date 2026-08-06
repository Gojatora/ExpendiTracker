from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from src.models.models import User, Region
from src.schemas.user import UserCreate
from src.services.token_service import create_access_token

password_hash = PasswordHash.recommended()


class EmailAlreadyRegisteredError(Exception):
    """Raised when attempting to register an email that already exists."""
    pass


class InvalidCredentialsError(Exception):
    """Raised when login email doesn't exist or password doesn't match.
    Deliberately generic - never reveals which one was wrong, so an
    attacker can't use this endpoint to enumerate which emails are registered.
    """
    pass

class RegionNotFoundError(Exception):
    """Raised when the given region_id doesn't exist."""
    pass


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_user(self, user_data: UserCreate) -> User:
        existing = self.db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise EmailAlreadyRegisteredError(f"Email already registered: {user_data.email}")

        hashed = password_hash.hash(user_data.password)

        new_user = User(
            email=user_data.email,
            password_hash=hashed,
        )
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)

        return new_user

    def login_user(self, email: str, password: str) -> str:
        """Verifies credentials and returns a signed access token on success."""
        user = self.db.query(User).filter(User.email == email).first()

        if not user or not password_hash.verify(password, user.password_hash):
            raise InvalidCredentialsError("Invalid email or password.")

        return create_access_token(user.user_id)

    def update_user_region(self, user_id: int, region_id: int | None) -> User:
        if region_id is not None:
            region = self.db.query(Region).filter(Region.region_id == region_id).first()
            if region is None:
                raise RegionNotFoundError(f"Region not found: {region_id}")

        user = self.db.query(User).filter(User.user_id == user_id).first()
        user.region_id = region_id
        self.db.commit()
        self.db.refresh(user)

        return user