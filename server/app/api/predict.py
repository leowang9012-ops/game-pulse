"""
预测 API 路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import pandas as pd

from app.services.predictor import forecast_timeseries

router = APIRouter(prefix="/api", tags=["prediction"])

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"


class PredictRequest(BaseModel):
    dataset_id: str
    date_column: str
    value_column: str
    periods: int = 30
    freq: str = "D"


@router.post("/predict")
async def predict(req: PredictRequest):
    """时序预测"""
    csv_path = UPLOADS_DIR / f"{req.dataset_id}.csv"
    if not csv_path.exists():
        raise HTTPException(404, "Dataset not found")

    df = pd.read_csv(csv_path)

    if req.date_column not in df.columns:
        raise HTTPException(400, f"Date column '{req.date_column}' not found")
    if req.value_column not in df.columns:
        raise HTTPException(400, f"Value column '{req.value_column}' not found")

    result = forecast_timeseries(
        df=df,
        date_col=req.date_column,
        value_col=req.value_column,
        periods=req.periods,
        freq=req.freq,
    )

    if "error" in result:
        raise HTTPException(400, result["error"])

    return result
