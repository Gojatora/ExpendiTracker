from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.models.models import Region
from src.schemas.region import RegionOut

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[RegionOut])
def get_regions(db: Session = Depends(get_db)):
    return db.query(Region).order_by(Region.region_name).all()