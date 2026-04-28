/**
 * GamePulse 内置示例数据
 * 当后端不可用时，使用这些数据展示功能
 */

export const DEMO_PROFILE = {
  dataset_id: "demo_game_data",
  filename: "街篮2_运营数据_2025Q1.csv",
  rows: 90,
  columns_count: 6,
  columns: [
    { name: "date", dtype: "object", non_null: 90, null_count: 0, null_pct: 0, unique_count: 90, is_date_candidate: true },
    { name: "dau", dtype: "int64", non_null: 90, null_count: 0, null_pct: 0, min: 9800, max: 22500, mean: 14850, std: 3200 },
    { name: "revenue", dtype: "float64", non_null: 90, null_count: 0, null_pct: 0, min: 5200, max: 18900, mean: 10350, std: 3100 },
    { name: "new_users", dtype: "int64", non_null: 90, null_count: 0, null_pct: 0, min: 1500, max: 6200, mean: 3100, std: 1200 },
    { name: "retention_d1", dtype: "float64", non_null: 90, null_count: 0, null_pct: 0, min: 28.5, max: 42.1, mean: 34.2, std: 3.8 },
    { name: "pay_rate", dtype: "float64", non_null: 90, null_count: 0, null_pct: 0, min: 2.1, max: 5.8, mean: 3.6, std: 0.9 },
  ],
  numeric_columns: ["dau", "revenue", "new_users", "retention_d1", "pay_rate"],
  date_candidates: ["date"],
};

function genDailyData() {
  const data = [];
  const startDate = new Date("2025-01-01");
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekMultiplier = isWeekend ? 1.25 : 1;
    const trend = 1 + i * 0.003;

    const dau = Math.round((10000 + Math.sin(i / 7 * Math.PI * 2) * 2000 + Math.random() * 1500) * weekMultiplier * trend);
    const revenue = Math.round((6000 + Math.sin(i / 7 * Math.PI * 2) * 2500 + Math.random() * 1200) * weekMultiplier * trend);
    const newUsers = Math.round((2000 + Math.sin(i / 7 * Math.PI * 2) * 800 + Math.random() * 500) * weekMultiplier);
    const retentionD1 = +(29 + Math.sin(i / 14 * Math.PI * 2) * 4 + Math.random() * 3).toFixed(1);
    const payRate = +(2.5 + Math.sin(i / 21 * Math.PI * 2) * 1.2 + Math.random() * 0.8).toFixed(1);

    data.push({
      date: date.toISOString().split("T")[0],
      dau,
      revenue,
      new_users: newUsers,
      retention_d1: retentionD1,
      pay_rate: payRate,
    });
  }
  return data;
}

export const DEMO_PREVIEW = {
  columns: ["date", "dau", "revenue", "new_users", "retention_d1", "pay_rate"],
  rows: genDailyData(),
  total: 90,
};

export const DEMO_PREDICT = (() => {
  const historical = genDailyData().map(d => ({ date: d.date, value: d.dau }));
  const lastDate = new Date("2025-03-31");
  const predictions = [];
  for (let i = 1; i <= 30; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const base = 15500 + i * 30;
    const noise = 800;
    predictions.push({
      date: date.toISOString().split("T")[0],
      value: Math.round(base + (isWeekend ? 2000 : 0)),
      lower: Math.round(base - noise + (isWeekend ? 2000 : 0)),
      upper: Math.round(base + noise + (isWeekend ? 2000 : 0)),
    });
  }
  return {
    method: "Prophet 时序模型 (Demo)",
    historical,
    predictions,
    history_stats: { mean: 14850, std: 3200, min: 9800, max: 22500, trend: "缓慢上升" },
    forecast_stats: { mean: 16200, trend: "缓慢上升", confidence_interval: "80%" },
    insights: [
      "📊 DAU 历史均值 14,850，周末峰值可达 22,000+",
      "📈 预测显示缓慢上升趋势，Q2 有望突破 16,000 均值",
      "⚠️ 周末与工作日差距约 25%，建议关注周末活动效果",
      "✅ 数据波动性适中（变异系数 21.5%），整体健康",
    ],
  };
})();

export const DEMO_CORRELATION = {
  matrix: [
    { column: "dau", dau: 1, revenue: 0.996, new_users: 0.971, retention_d1: 0.975, pay_rate: 0.82 },
    { column: "revenue", dau: 0.996, revenue: 1, new_users: 0.983, retention_d1: 0.975, pay_rate: 0.85 },
    { column: "new_users", dau: 0.971, revenue: 0.983, new_users: 1, retention_d1: 0.968, pay_rate: 0.79 },
    { column: "retention_d1", dau: 0.975, revenue: 0.975, new_users: 0.968, retention_d1: 1, pay_rate: 0.88 },
    { column: "pay_rate", dau: 0.82, revenue: 0.85, new_users: 0.79, retention_d1: 0.88, pay_rate: 1 },
  ],
  columns: ["dau", "revenue", "new_users", "retention_d1", "pay_rate"],
  strong_pairs: [
    { col_a: "dau", col_b: "revenue", correlation: 0.996, strength: "强正相关" },
    { col_a: "revenue", col_b: "new_users", correlation: 0.983, strength: "强正相关" },
    { col_a: "dau", col_b: "retention_d1", correlation: 0.975, strength: "强正相关" },
    { col_a: "revenue", col_b: "retention_d1", correlation: 0.975, strength: "强正相关" },
    { col_a: "dau", col_b: "new_users", correlation: 0.971, strength: "强正相关" },
    { col_a: "new_users", col_b: "retention_d1", correlation: 0.968, strength: "强正相关" },
  ],
  insights: [
    "🔗 DAU ↔ 收入: 强正相关（r=0.996）—— DAU 是收入的核心驱动",
    "🔗 DAU ↔ 新增用户: 强正相关（r=0.971）—— 拉新活动直接影响大盘",
    "🔗 DAU ↔ D1留存: 强正相关（r=0.975）—— 留存好的日子 DAU 自然高",
  ],
};

export const DEMO_RETENTION = {
  curve: Array.from({ length: 31 }, (_, i) => ({
    day: i,
    retention: i === 0 ? 100 : +(100 * Math.pow(0.75, Math.sqrt(i))).toFixed(1),
  })),
  milestones: [
    { day: 1, label: "D1", avg_retention: 35.2, min_retention: 28.5, max_retention: 42.1 },
    { day: 3, label: "D3", avg_retention: 22.8, min_retention: 18.2, max_retention: 28.5 },
    { day: 7, label: "D7", avg_retention: 15.3, min_retention: 11.8, max_retention: 19.2 },
    { day: 14, label: "D14", avg_retention: 10.1, min_retention: 7.5, max_retention: 13.8 },
    { day: 30, label: "D30", avg_retention: 6.8, min_retention: 4.2, max_retention: 9.5 },
  ],
  total_users: 12580,
  total_cohorts: 90,
  insights: [
    "✅ D1 留存 35.2%，略高于竞技游戏行业基准（30-40%）",
    "⚠️ D7 留存 15.3%，中等水平，次周是留存断崖关键期",
    "⚠️ D30 留存 6.8%，长期留存需关注，建议优化新手引导和社交系统",
  ],
};
