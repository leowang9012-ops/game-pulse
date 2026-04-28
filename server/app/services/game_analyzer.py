"""
游戏数据分析服务
- 留存分析
- 收入指标计算
- 用户分层 (RFM)
"""

import pandas as pd
import numpy as np
from typing import Optional


def analyze_retention(
    df: pd.DataFrame,
    user_col: str,
    date_col: str,
    cohort_col: Optional[str] = None,
) -> dict:
    """
    留存分析
    
    Args:
        df: 数据框（每行代表一个用户的一次活跃）
        user_col: 用户ID列名
        date_col: 日期列名
        cohort_col: 分组列名（可选，如渠道来源）
    
    Returns:
        留存矩阵 + 留存曲线数据
    """
    data = df[[user_col, date_col]].dropna().copy()
    data[date_col] = pd.to_datetime(data[date_col])
    data["_date"] = data[date_col].dt.date

    # 按用户分组，找到首次活跃日期
    first_active = data.groupby(user_col)["_date"].min().reset_index()
    first_active.columns = [user_col, "cohort_date"]

    data = data.merge(first_active, on=user_col)
    data["days_since_first"] = (data["_date"] - data["cohort_date"]).apply(lambda x: x.days)

    # 计算每个 cohort 的留存
    max_days = min(data["days_since_first"].max(), 30)  # 最多算30天
    cohort_sizes = data.groupby("cohort_date")[user_col].nunique()

    retention_matrix = []
    curve_data = []

    for day in range(0, max_days + 1):
        active_users = data[data["days_since_first"] == day].groupby("cohort_date")[user_col].nunique()
        rates = (active_users / cohort_sizes * 100).round(1)
        avg_rate = round(float(rates.mean()), 1) if len(rates) > 0 else 0

        curve_data.append({"day": day, "retention": avg_rate})

        if day in [1, 3, 7, 14, 30] and day <= max_days:
            retention_matrix.append({
                "day": day,
                "label": f"D{day}",
                "avg_retention": avg_rate,
                "min_retention": round(float(rates.min()), 1) if len(rates) > 0 else 0,
                "max_retention": round(float(rates.max()), 1) if len(rates) > 0 else 0,
            })

    return {
        "curve": curve_data,
        "milestones": retention_matrix,
        "total_users": int(data[user_col].nunique()),
        "total_cohorts": int(data["cohort_date"].nunique()),
        "insights": _retention_insights(curve_data),
    }


def analyze_revenue(
    df: pd.DataFrame,
    amount_col: str,
    user_col: str,
    date_col: Optional[str] = None,
) -> dict:
    """
    收入指标分析
    
    Args:
        df: 数据框（每行代表一笔付费）
        amount_col: 金额列名
        user_col: 用户ID列名
        date_col: 日期列名（可选）
    
    Returns:
        ARPU, ARPPU, 付费分布等指标
    """
    data = df[[user_col, amount_col]].dropna().copy()

    total_revenue = float(data[amount_col].sum())
    total_users = int(data[user_col].nunique())
    paying_users = int(data.groupby(user_col)[amount_col].sum().gt(0).sum())

    # 按用户汇总
    user_totals = data.groupby(user_col)[amount_col].sum()

    # 分位数
    percentiles = [10, 25, 50, 75, 90, 95, 99]
    quantile_values = {f"p{p}": round(float(user_totals.quantile(p / 100)), 2) for p in percentiles}

    # 付费分层
    def tier(amount):
        if amount == 0: return "非付费"
        elif amount < 30: return "小R (<30)"
        elif amount < 300: return "中R (30-300)"
        elif amount < 3000: return "大R (300-3000)"
        else: return "鲸鱼 (>3000)"

    tier_dist = user_totals.apply(tier).value_counts().to_dict()

    # 有日期时计算趋势
    trend = None
    if date_col and date_col in df.columns:
        data[date_col] = pd.to_datetime(df[date_col])
        daily = data.groupby(data[date_col].dt.date)[amount_col].sum().reset_index()
        daily.columns = ["date", "amount"]
        trend = [{"date": str(r["date"]), "amount": round(float(r["amount"]), 2)} for _, r in daily.iterrows()]

    return {
        "total_revenue": round(total_revenue, 2),
        "total_users": total_users,
        "paying_users": paying_users,
        "pay_rate": round(paying_users / total_users * 100, 1) if total_users > 0 else 0,
        "arpu": round(total_revenue / total_users, 2) if total_users > 0 else 0,
        "arppu": round(total_revenue / paying_users, 2) if paying_users > 0 else 0,
        "quantiles": quantile_values,
        "tier_distribution": tier_dist,
        "trend": trend,
        "insights": _revenue_insights(total_revenue, paying_users, total_users, quantile_values),
    }


def analyze_correlation(df: pd.DataFrame, numeric_cols: list[str]) -> dict:
    """
    相关性分析
    
    Args:
        df: 数据框
        numeric_cols: 要分析的数值列
    
    Returns:
        相关性矩阵 + 强相关对
    """
    cols = [c for c in numeric_cols if c in df.columns]
    if len(cols) < 2:
        return {"error": "数值列不足 2 个，无法计算相关性"}

    corr = df[cols].corr().round(3)

    # 找强相关对
    strong_pairs = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = corr.iloc[i, j]
            if abs(r) > 0.5:
                strong_pairs.append({
                    "col_a": cols[i],
                    "col_b": cols[j],
                    "correlation": round(float(r), 3),
                    "strength": "强正相关" if r > 0.7 else "中等正相关" if r > 0.5 else "强负相关" if r < -0.7 else "中等负相关",
                })

    # 转换为前端可用的矩阵格式
    matrix = []
    for col in cols:
        row = {"column": col}
        for other in cols:
            row[other] = round(float(corr.loc[col, other]), 3)
        matrix.append(row)

    return {
        "matrix": matrix,
        "columns": cols,
        "strong_pairs": sorted(strong_pairs, key=lambda x: abs(x["correlation"]), reverse=True),
        "insights": _correlation_insights(strong_pairs),
    }


def detect_anomalies(df: pd.DataFrame, value_col: str, method: str = "iqr") -> dict:
    """
    异常值检测
    
    Args:
        df: 数据框
        value_col: 要检测的数值列
        method: 方法 (iqr / zscore)
    
    Returns:
        异常值列表 + 统计信息
    """
    if value_col not in df.columns:
        return {"error": f"列 {value_col} 不存在"}

    values = df[value_col].dropna()
    if len(values) < 10:
        return {"error": "数据量不足 10 条，无法检测异常值"}

    if method == "iqr":
        q1 = values.quantile(0.25)
        q3 = values.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
    else:
        mean = values.mean()
        std = values.std()
        lower = mean - 3 * std
        upper = mean + 3 * std

    anomalies = values[(values < lower) | (values > upper)]
    anomaly_indices = anomalies.index.tolist()

    return {
        "total": len(values),
        "anomaly_count": len(anomalies),
        "anomaly_pct": round(len(anomalies) / len(values) * 100, 1),
        "bounds": {"lower": round(float(lower), 2), "upper": round(float(upper), 2)},
        "mean": round(float(values.mean()), 2),
        "std": round(float(values.std()), 2),
        "anomaly_values": [
            {"index": int(i), "value": round(float(anomalies.loc[i]), 2)}
            for i in anomaly_indices[:50]  # 最多返回50个
        ],
        "method": method,
    }


# === Insight generators ===

def _retention_insights(curve: list[dict]) -> list[str]:
    insights = []
    if len(curve) < 2:
        return ["数据不足"]

    d1 = next((c["retention"] for c in curve if c["day"] == 1), None)
    d7 = next((c["retention"] for c in curve if c["day"] == 7), None)
    d30 = next((c["retention"] for c in curve if c["day"] == 30), None)

    if d1 is not None:
        if d1 < 20:
            insights.append(f"⚠️ D1 留存 {d1}% 偏低，行业基准约 30-40%，首日体验需优化")
        elif d1 > 40:
            insights.append(f"✅ D1 留存 {d1}% 良好，高于行业平均")
        else:
            insights.append(f"📊 D1 留存 {d1}%，处于行业中等水平")

    if d7 is not None:
        if d7 < 10:
            insights.append(f"⚠️ D7 留存 {d7}% 偏低，次周留存断崖明显")
        elif d7 > 20:
            insights.append(f"✅ D7 留存 {d7}%，用户粘性较好")

    if d30 is not None:
        if d30 < 5:
            insights.append(f"⚠️ D30 留存 {d30}%，长期留存是核心短板")
        elif d30 > 10:
            insights.append(f"✅ D30 留存 {d30}%，长期留存表现优秀")

    return insights if insights else ["留存数据正常"]


def _revenue_insights(revenue, paying, total, quantiles) -> list[str]:
    insights = []
    pay_rate = paying / total * 100 if total > 0 else 0

    if pay_rate < 2:
        insights.append(f"⚠️ 付费率 {pay_rate:.1f}% 偏低，需优化付费引导")
    elif pay_rate > 5:
        insights.append(f"✅ 付费率 {pay_rate:.1f}% 良好")

    # 检查鲸鱼依赖
    p99 = quantiles.get("p99", 0)
    p50 = quantiles.get("p50", 0)
    if p99 > 0 and p50 > 0 and p99 / p50 > 100:
        insights.append(f"⚠️ 收入高度依赖头部用户（P99/P50={p99/p50:.0f}倍），鲸鱼风险需关注")

    return insights if insights else ["收入数据正常"]


def _correlation_insights(pairs: list) -> list[str]:
    if not pairs:
        return ["未发现强相关关系"]
    insights = []
    for p in pairs[:3]:
        insights.append(f"🔗 {p['col_a']} ↔ {p['col_b']}: {p['strength']}（r={p['correlation']}）")
    return insights
