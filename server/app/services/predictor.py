"""
预测服务 - 时序预测 + 趋势分析
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import json

# 尝试导入 prophet，不可用时降级
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False


def forecast_timeseries(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    periods: int = 30,
    freq: str = "D",
) -> dict:
    """
    时序预测
    
    Args:
        df: 数据框
        date_col: 日期列名
        value_col: 预测目标列名
        periods: 预测天数
        freq: 频率 (D=日, W=周, M=月)
    
    Returns:
        预测结果 + 历史数据 + 置信区间
    """
    # 准备数据
    ts_data = df[[date_col, value_col]].dropna().copy()
    ts_data[date_col] = pd.to_datetime(ts_data[date_col])
    ts_data = ts_data.sort_values(date_col)
    ts_data = ts_data.groupby(date_col)[value_col].mean().reset_index()

    if len(ts_data) < 7:
        return {"error": "数据量不足，至少需要 7 个时间点"}

    # 历史统计
    history_stats = {
        "mean": round(float(ts_data[value_col].mean()), 2),
        "std": round(float(ts_data[value_col].std()), 2),
        "min": round(float(ts_data[value_col].min()), 2),
        "max": round(float(ts_data[value_col].max()), 2),
        "trend": _detect_trend(ts_data[value_col].values),
    }

    if HAS_PROPHET:
        return _prophet_forecast(ts_data, date_col, value_col, periods, freq, history_stats)
    else:
        return _simple_forecast(ts_data, date_col, value_col, periods, freq, history_stats)


def _prophet_forecast(ts_data, date_col, value_col, periods, freq, history_stats):
    """使用 Prophet 进行预测"""
    prophet_df = ts_data.rename(columns={date_col: "ds", value_col: "y"})

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.fit(prophet_df)

    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)

    # 提取历史部分
    hist_end = len(ts_data)
    historical = []
    for i in range(hist_end):
        historical.append({
            "date": ts_data[date_col].iloc[i].strftime("%Y-%m-%d"),
            "value": round(float(ts_data[value_col].iloc[i]), 2),
        })

    # 提取预测部分
    predictions = []
    for i in range(hist_end, len(forecast)):
        predictions.append({
            "date": forecast["ds"].iloc[i].strftime("%Y-%m-%d"),
            "value": round(float(forecast["yhat"].iloc[i]), 2),
            "lower": round(float(forecast["yhat_lower"].iloc[i]), 2),
            "upper": round(float(forecast["yhat_upper"].iloc[i]), 2),
        })

    # 趋势分析
    pred_values = [p["value"] for p in predictions]
    forecast_trend = _detect_trend(np.array(pred_values))

    return {
        "method": "Prophet",
        "historical": historical,
        "predictions": predictions,
        "history_stats": history_stats,
        "forecast_stats": {
            "mean": round(float(np.mean(pred_values)), 2),
            "trend": forecast_trend,
            "confidence_interval": "80%",
        },
        "insights": _generate_insights(history_stats, forecast_trend, value_col),
    }


def _simple_forecast(ts_data, date_col, value_col, periods, freq, history_stats):
    """降级预测：移动平均 + 线性趋势"""
    values = ts_data[value_col].values

    # 移动平均 (7天窗口)
    window = min(7, len(values) // 2)
    ma = np.convolve(values, np.ones(window) / window, mode="valid")

    # 线性趋势外推
    x = np.arange(len(values))
    coeffs = np.polyfit(x, values, 1)
    slope, intercept = coeffs

    last_date = pd.to_datetime(ts_data[date_col].iloc[-1])
    freq_map = {"D": "days", "W": "weeks", "M": "months"}

    historical = []
    for i in range(len(ts_data)):
        historical.append({
            "date": ts_data[date_col].iloc[i].strftime("%Y-%m-%d"),
            "value": round(float(values[i]), 2),
        })

    predictions = []
    for i in range(1, periods + 1):
        future_date = last_date + pd.Timedelta(**{freq_map.get(freq, "days"): i})
        base_val = slope * (len(values) + i) + intercept
        noise = history_stats["std"] * 0.5
        predictions.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "value": round(float(base_val), 2),
            "lower": round(float(base_val - 1.96 * noise), 2),
            "upper": round(float(base_val + 1.96 * noise), 2),
        })

    pred_values = [p["value"] for p in predictions]
    forecast_trend = _detect_trend(np.array(pred_values))

    return {
        "method": "移动平均 + 线性趋势 (降级模式，建议安装 prophet)",
        "historical": historical,
        "predictions": predictions,
        "history_stats": history_stats,
        "forecast_stats": {
            "mean": round(float(np.mean(pred_values)), 2),
            "trend": forecast_trend,
            "confidence_interval": "95%",
        },
        "insights": _generate_insights(history_stats, forecast_trend, value_col),
    }


def _detect_trend(values: np.ndarray) -> str:
    """检测趋势方向"""
    if len(values) < 3:
        return "数据不足"
    x = np.arange(len(values))
    slope = np.polyfit(x, values, 1)[0]
    mean_val = np.mean(values)
    relative_slope = slope / mean_val if mean_val != 0 else 0

    if abs(relative_slope) < 0.005:
        return "平稳"
    elif relative_slope > 0.02:
        return "显著上升"
    elif relative_slope > 0:
        return "缓慢上升"
    elif relative_slope < -0.02:
        return "显著下降"
    else:
        return "缓慢下降"


def _generate_insights(history_stats: dict, forecast_trend: str, metric_name: str) -> list:
    """生成分析洞察"""
    insights = []

    # 波动性分析
    cv = history_stats["std"] / history_stats["mean"] if history_stats["mean"] > 0 else 0
    if cv > 0.5:
        insights.append(f"⚠️ {metric_name} 波动较大（变异系数 {cv:.1%}），数据稳定性需关注")
    elif cv < 0.1:
        insights.append(f"✅ {metric_name} 波动很小（变异系数 {cv:.1%}），数据非常稳定")

    # 趋势洞察
    if "上升" in forecast_trend:
        insights.append(f"📈 预测显示 {metric_name} 呈 {forecast_trend} 趋势")
    elif "下降" in forecast_trend:
        insights.append(f"📉 预测显示 {metric_name} 呈 {forecast_trend} 趋势，建议关注原因")
    else:
        insights.append(f"➡️ {metric_name} 预测期内保持平稳")

    return insights
