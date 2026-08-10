from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies import get_current_user
from src.models.models import User
from src.schemas.comparison import ComparisonResponse, MonthOverMonthResponse
from src.services.comparison_service import ComparisonService, RegionNotFoundError

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.get("", response_model=ComparisonResponse)
def get_comparison(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ComparisonService(db)
    try:
        result = service.get_comparison(
            user_id=current_user.user_id,
            user_region_id=current_user.region_id,
            requested_region_name=region,
        )
    except RegionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified region does not exist.",
        )

    return ComparisonResponse(**result)

@router.get("/month-over-month", response_model=MonthOverMonthResponse)
def get_month_over_month_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ComparisonService(db)
    result = service.get_month_over_month(current_user.user_id)
    return MonthOverMonthResponse(**result)