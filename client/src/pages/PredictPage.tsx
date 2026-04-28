import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { TrendingUp, ArrowLeft, Loader2, Lightbulb } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart, ReferenceLine
} from "recharts";

const API_BASE = "http://localhost:8001";

interface Profile {
  dataset_id: string;
  filename: string;
  columns: { name: string; dtype: string; is_date_candidate?: boolean }[];
  numeric_columns: string[];
  date_candidates: string[];
}

interface PredictResult {
  method: string;
  historical: { date: string; value: number }[];
  predictions: { date: string; value: number; lower: number; upper: number }[];
  history_stats: { mean: number; std: number; min: number; max: number; trend: string };
  forecast_stats: { mean: number; trend: string; confidence_interval: string };
  insights: string[];
}

export function PredictPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dateCol, setDateCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [periods, setPeriods] = useState(30);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);

  useEffect(() => {
    if (!datasetId) return;
    fetch(`${API_BASE}/api/datasets/${datasetId}/profile`)
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p);
        // Auto-select date column
        if (p.date_candidates.length > 0) setDateCol(p.date_candidates[0]);
        // Auto-select value column (first numeric)
        if (p.numeric_columns.length > 0) setValueCol(p.numeric_columns[0]);
        setFetchingProfile(false);
      })
      .catch(() => setFetchingProfile(false));
  }, [datasetId]);

  const handlePredict = async () => {
    if (!datasetId || !dateCol || !valueCol) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          date_column: dateCol,
          value_column: valueCol,
          periods,
          freq: "D",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert(`预测失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Merge historical + prediction for chart
  const chartData = result ? [
    ...result.historical.map(d => ({ date: d.date, actual: d.value, predicted: null, lower: null, upper: null })),
    ...result.predictions.map(d => ({ date: d.date, actual: null, predicted: d.value, lower: d.lower, upper: d.upper })),
  ] : [];

  if (fetchingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <Link to={`/dashboard/${datasetId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回看板
          </Link>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            趋势预测
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">选择日期列和指标列，AI 自动生成趋势预测</p>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Config Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">日期列</label>
              <select
                value={dateCol}
                onChange={e => setDateCol(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-w-[180px]"
              >
                <option value="">选择日期列...</option>
                {profile?.columns.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} {c.is_date_candidate ? "📅" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">预测指标</label>
              <select
                value={valueCol}
                onChange={e => setValueCol(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-w-[180px]"
              >
                <option value="">选择指标列...</option>
                {profile?.numeric_columns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">预测天数</label>
              <select
                value={periods}
                onChange={e => setPeriods(Number(e.target.value))}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value={7}>7 天</option>
                <option value={14}>14 天</option>
                <option value={30}>30 天</option>
                <option value={60}>60 天</option>
                <option value={90}>90 天</option>
              </select>
            </div>

            <button
              onClick={handlePredict}
              disabled={!dateCol || !valueCol || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {loading ? "预测中..." : "开始预测"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Method & Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">预测方法</p>
                <p className="text-sm font-bold mt-1">{result.method}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">历史均值</p>
                <p className="text-2xl font-bold font-display">{result.history_stats.mean}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">历史趋势</p>
                <p className="text-sm font-bold mt-1">{result.history_stats.trend}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">预测趋势</p>
                <p className="text-sm font-bold mt-1">{result.forecast_stats.trend}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium mb-4">{valueCol} 趋势预测（{periods} 天）</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(240 5% 16%)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240 10% 8%)",
                        border: "1px solid hsl(240 5% 20%)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "hsl(240 5% 90%)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />

                    {/* Confidence band */}
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="url(#confidenceBand)"
                      name="置信上界"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="hsl(240 10% 8%)"
                      name="置信下界"
                    />

                    {/* Historical line */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(240 5% 60%)"
                      strokeWidth={2}
                      dot={false}
                      name="历史数据"
                      connectNulls={false}
                    />

                    {/* Prediction line */}
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(240 70% 60%)"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={false}
                      name="预测值"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            {result.insights.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning" /> AI 洞察
                </h3>
                <div className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
