import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { TrendingUp, ArrowLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from "recharts";
import { getProjectData, getProjects } from "../lib/storage";

const tipStyle = { backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" } as const;

export function PredictPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (!projectId) return;
    getProjectData(projectId).then(d => setData(d));
    getProjects().then(ps => setProjectName(ps.find(x => x.id === projectId)?.name || projectId));
  }, [projectId]);

  const dateCol = useMemo(() => {
    if (!data) return null;
    for (const h of data.headers) {
      const sample = data.rows.slice(0, 10).map(r => r[h]).filter(Boolean);
      if (sample.length >= 3 && sample.every(v => !isNaN(Date.parse(v)))) return h;
    }
    return null;
  }, [data]);

  const numericCols = useMemo(() => {
    if (!data) return [];
    return data.headers.filter(h => {
      const vals = data.rows.map(r => Number(r[h])).filter(v => !isNaN(v));
      return vals.length > data.rows.length * 0.3;
    });
  }, [data]);

  const [selectedCol, setSelectedCol] = useState("");
  useEffect(() => {
    if (numericCols.length > 0 && !selectedCol) setSelectedCol(numericCols[0]);
  }, [numericCols, selectedCol]);

  const chartData = useMemo(() => {
    if (!data || !selectedCol) return [];
    const rows = dateCol
      ? [...data.rows].sort((a, b) => new Date(a[dateCol]).getTime() - new Date(b[dateCol]).getTime())
      : data.rows;
    const values = rows.map(r => Number(r[selectedCol])).filter(v => !isNaN(v));
    const labels = dateCol ? rows.map(r => r[dateCol]) : rows.map((_, i) => `#${i + 1}`);

    const window = Math.min(7, Math.floor(values.length / 3));
    const recent = values.slice(-window);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;

    const historical = labels.map((d, i) => ({
      date: d, actual: values[i], predicted: null as number | null, lower: null as number | null, upper: null as number | null,
    }));

    const predictions = Array.from({ length: 30 }, (_, i) => {
      const val = Math.round(avg + trend * (i + 1));
      const noise = Math.round(Math.abs(val) * 0.08);
      const label = dateCol
        ? (() => { const dt = new Date(labels[labels.length - 1]); dt.setDate(dt.getDate() + i + 1); return dt.toISOString().split("T")[0]; })()
        : `预测${i + 1}`;
      return { date: label, actual: null, predicted: val, lower: val - noise, upper: val + noise };
    });

    return [...historical, ...predictions];
  }, [data, dateCol, selectedCol]);

  const stats = useMemo(() => {
    if (!data || !selectedCol) return null;
    const vals = data.rows.map(r => Number(r[selectedCol])).filter(v => !isNaN(v));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;
    return { mean: +mean.toFixed(1), min: +min.toFixed(1), max: +max.toFixed(1), std: +std.toFixed(1), cv: +cv.toFixed(1) };
  }, [data, selectedCol]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">未找到项目数据</p>
          <Link to="/" className="text-primary hover:underline text-sm">返回项目列表</Link>
        </div>
      </div>
    );
  }

  if (numericCols.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">未检测到数值列</p>
          <p className="text-xs text-muted-foreground mb-4">请确认上传的文件包含数值数据</p>
          <Link to="/" className="text-primary hover:underline text-sm">返回项目列表</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回项目列表
          </Link>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> 趋势预测 · {projectName}
          </h1>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {!dateCol && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-sm text-warning">
            ⚠️ 未检测到日期列，已用行号作为 X 轴。如需按时间排序，请确保数据中有日期列。
          </div>
        )}

        {/* Column selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">选择指标：</span>
          {numericCols.map(col => (
            <button
              key={col}
              onClick={() => setSelectedCol(col)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCol === col ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {col}
            </button>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">趋势预测（移动平均 + 线性趋势）</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tipStyle} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ciGrad)" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(240 10% 8%)" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(240 70% 60%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(0 70% 60%)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "均值", value: stats.mean },
              { label: "最小值", value: stats.min },
              { label: "最大值", value: stats.max },
              { label: "标准差", value: stats.std },
              { label: "变异系数", value: `${stats.cv}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold font-display">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
