"""
GamePulse - 游戏数据脉搏
AI 驱动的游戏数据分析与预测平台
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import json
import os
import uuid
from datetime import datetime
from pathlib import Path

app = FastAPI(title="GamePulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "GamePulse API"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传 CSV/Excel 数据文件"""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in [".csv", ".xlsx", ".xls", ".json"]:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # 保存文件
    dataset_id = f"ds_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    raw_path = UPLOADS_DIR / f"{dataset_id}_raw{ext}"

    content = await file.read()
    with open(raw_path, "wb") as f:
        f.write(content)

    # 解析数据
    try:
        if ext == ".csv":
            df = pd.read_csv(raw_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(raw_path)
        else:
            df = pd.read_json(raw_path)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")

    # 生成数据概览
    profile = generate_profile(df, dataset_id, file.filename)

    # 保存解析后的标准化 CSV 以便后续快速读取
    csv_path = UPLOADS_DIR / f"{dataset_id}.csv"
    df.to_csv(csv_path, index=False)

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "profile": profile,
    }


@app.get("/api/datasets/{dataset_id}/profile")
async def get_profile(dataset_id: str):
    """获取数据集概览"""
    csv_path = UPLOADS_DIR / f"{dataset_id}.csv"
    if not csv_path.exists():
        raise HTTPException(404, "Dataset not found")

    df = pd.read_csv(csv_path)
    return generate_profile(df, dataset_id)


@app.get("/api/datasets/{dataset_id}/preview")
async def preview_data(dataset_id: str, rows: int = 50):
    """预览数据前 N 行"""
    csv_path = UPLOADS_DIR / f"{dataset_id}.csv"
    if not csv_path.exists():
        raise HTTPException(404, "Dataset not found")

    df = pd.read_csv(csv_path)
    return {
        "columns": list(df.columns),
        "rows": json.loads(df.head(rows).to_json(orient="records")),
        "total": len(df),
    }


@app.get("/api/datasets")
async def list_datasets():
    """列出所有已上传的数据集"""
    datasets = []
    for f in sorted(UPLOADS_DIR.glob("*.csv"), reverse=True):
        if f.stem.endswith("_raw"):
            continue
        stat = f.stat()
        datasets.append({
            "dataset_id": f.stem,
            "size_mb": round(stat.st_size / 1024 / 1024, 2),
            "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return {"datasets": datasets}


def generate_profile(df: pd.DataFrame, dataset_id: str, filename: str) -> dict:
    """生成数据集概览"""
    columns = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        col_info = {
            "name": col,
            "dtype": dtype,
            "non_null": int(df[col].notna().sum()),
            "null_count": int(df[col].isna().sum()),
            "null_pct": round(df[col].isna().mean() * 100, 1),
        }

        if dtype in ["int64", "float64"]:
            col_info["min"] = float(df[col].min()) if not df[col].isna().all() else None
            col_info["max"] = float(df[col].max()) if not df[col].isna().all() else None
            col_info["mean"] = round(float(df[col].mean()), 2) if not df[col].isna().all() else None
            col_info["std"] = round(float(df[col].std()), 2) if not df[col].isna().all() else None
            # 猜测是否为日期列
            col_info["is_date_candidate"] = False
        else:
            col_info["unique_count"] = int(df[col].nunique())
            # 检查是否可能是日期
            try:
                pd.to_datetime(df[col].dropna().head(5))
                col_info["is_date_candidate"] = True
            except:
                col_info["is_date_candidate"] = False

        columns.append(col_info)

    # 自动检测日期列和数值列
    date_candidates = [c["name"] for c in columns if c.get("is_date_candidate")]
    numeric_columns = [c["name"] for c in columns if c["dtype"] in ["int64", "float64"]]

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "rows": len(df),
        "columns_count": len(df.columns),
        "columns": columns,
        "numeric_columns": numeric_columns,
        "date_candidates": date_candidates,
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }


from app.api.predict import router as predict_router
from app.api.analyze import router as analyze_router
app.include_router(predict_router)
app.include_router(analyze_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
