import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def create_access_token(user_id: int) -> str:
    """Creates a signed JWT containing the user's id, expiring in 7 days."""
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    payload = {
        "sub": str(user_id),  # "subject" - standard JWT claim for whose token this is
        "exp": expire,        # standard JWT claim - library auto-rejects expired tokens
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodes and verifies a JWT. Raises jwt exceptions if invalid/expired."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])