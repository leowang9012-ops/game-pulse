import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { TrendingUp, ArrowLeft, Database } from "lucide-react";
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
      const sample = data.rows.slice(0, 5).map(r => r[h]);
      if (sample.every(v => !isNaN(Date.parse(v)))) return h;
    }
    return null;
  }, [data]);

  const numericCols = useMemo(() => {
    if (!data) return [];
    return data.headers.filter(h => {
      const vals = data.rows.map(r => Number(r[h])).filter(v => !isNaN(v));
      return vals.length > data.rows.length * 0.5;
    });
  }, [data]);

  const [selectedCol, setSelectedCol] = useState<string>("");
  useEffect(() => {
    if (numericCols.length > 0 && !selectedCol) setSelectedCol(numericCols[0]);
  }, [numericCols, selectedCol]);

  const chartData = useMemo(() => {
    if (!data || !dateCol || !selectedCol) return [];
    const sorted = [...data.rows].sort((a, b) => new Date(a[dateCol]).getTime() - new Date(b[dateCol]).getTime());
    const values = sorted.map(r => Number(r[selectedCol])).filter(v => !isNaN(v));
    const dates = sorted.map(r => r[dateCol]);

    // Moving average prediction (7-day window)
    const window = Math.min(7, Math.floor(values.length / 3));
    const recent = values.slice(-window);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;

    const historical = dates.map((d, i) => ({
      date: d, actual: values[i], predicted: null, lower: null, upper: null,
    }));

    const lastDate = new Date(dates[dates.length - 1]);
    const predictions = Array.from({ length: 30 }, (_, i) => {
      const dt = new Date(lastDate);
      dt.setDate(dt.getDate() + i + 1);
      const val = Math.round(avg + trend * (i + 1));
      const noise = Math.round(Math.abs(val) * 0.08);
      return {
        date: dt.toISOString().split("T")[0],
        actual: null, predicted: val, lower: val - noise, upper: val + noise,
      };
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
    const cv = mean !== 0 ? (std / mean * 100) : 0;
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回项目列表
          </Link>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            趋势预测 · {projectName}
          </h1>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Column Selector */}
        {numericCols.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">选择指标：</span>
            {numericCols.map(col => (
              <button
                key={col}
                onClick={() => setSelectedCol(col)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCol === col ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">均值</p>
              <p className="text-xl font-bold">{stats.mean.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">范围</p>
              <p className="text-sm font-bold mt-1">{stats.min.toLocaleString()} ~ {stats.max.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">标准差</p>
              <p className="text-xl font-bold">{stats.std}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">变异系数</p>
              <p className="text-xl font-bold">{stats.cv}%</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">稳定性</p>
              <p className={`text-sm font-bold mt-1 ${stats.cv < 20 ? "text-success" : stats.cv < 50 ? "text-warning" : "text-destructive"}`}>
                {stats.cv < 20 ? "稳定" : stats.cv < 50 ? "波动" : "剧烈波动"}
              </p>
            </div>
          </div>
        )}

        {/* Prediction Chart */}
        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">{selectedCol} · 30天预测</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tipStyle} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(240 10% 8%)" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(240 5% 60%)" strokeWidth={2} dot={false} name="历史" connectNulls={false} />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(240 70% 60%)" strokeWidth={2.5} strokeDasharray="5 3" dot={false} name="预测" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
