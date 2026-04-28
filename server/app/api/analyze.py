"""
游戏分析 API 路由
- 留存分析
- 收入分析
- 相关性分析
- 异常检测
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import pandas as pd
from typing import Optional

from app.services.game_analyzer import (
    analyze_retention,
    analyze_revenue,
    analyze_correlation,
    detect_anomalies,
)

router = APIRouter(prefix="/api/analyze", tags=["game-analysis"])

UPLOADS_DIR = Path(__file__).parent.parent.parent.parent / "data" / "uploads"


class RetentionRequest(BaseModel):
    dataset_id: str
    user_column: str
    date_column: str
    cohort_column: Optional[str] = None


class RevenueRequest(BaseModel):
    dataset_id: str
    amount_column: str
    user_column: str
    date_column: Optional[str] = None


class CorrelationRequest(BaseModel):
    dataset_id: str
    columns: list[str]


class AnomalyRequest(BaseModel):
    dataset_id: str
    value_column: str
    method: str = "iqr"


def _load_dataset(dataset_id: str) -> pd.DataFrame:
    path = UPLOADS_DIR / f"{dataset_id}.csv"
    if not path.exists():
        raise HTTPException(404, "Dataset not found")
    return pd.read_csv(path)


@router.post("/retention")
async def retention_analysis(req: RetentionRequest):
    """留存分析"""
    df = _load_dataset(req.dataset_id)
    for col in [req.user_column, req.date_column]:
        if col not in df.columns:
            raise HTTPException(400, f"Column '{col}' not found")
    return analyze_retention(df, req.user_column, req.date_column, req.cohort_column)


@router.post("/revenue")
async def revenue_analysis(req: RevenueRequest):
    """收入指标分析"""
    df = _load_dataset(req.dataset_id)
    for col in [req.amount_column, req.user_column]:
        if col not in df.columns:
            raise HTTPException(400, f"Column '{col}' not found")
    return analyze_revenue(df, req.amount_column, req.user_column, req.date_column)


@router.post("/correlation")
async def correlation_analysis(req: CorrelationRequest):
    """相关性分析"""
    df = _load_dataset(req.dataset_id)
    return analyze_correlation(df, req.columns)


@router.post("/anomaly")
async def anomaly_detection(req: AnomalyRequest):
    """异常值检测"""
    df = _load_dataset(req.dataset_id)
    if req.value_column not in df.columns:
        raise HTTPException(400, f"Column '{req.value_column}' not found")
    return detect_anomalies(df, req.value_column, req.method)
