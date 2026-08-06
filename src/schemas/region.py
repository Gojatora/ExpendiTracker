from pydantic import BaseModel, ConfigDict


class RegionOut(BaseModel):
    region_id: int
    region_name: str

    model_config = ConfigDict(from_attributes=True)