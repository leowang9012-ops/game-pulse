import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, TrendingUp, BarChart3, GitBranch, ArrowRight,
  Database, Microscope, AlertTriangle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Legend
} from "recharts";
import {
  DEMO_PROFILE, DEMO_PREVIEW, DEMO_PREDICT,
  DEMO_CORRELATION, DEMO_RETENTION
} from "@/data/demo";

type Tab = "dashboard" | "predict" | "analysis";

export function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "数据看板", icon: <Database className="w-4 h-4" /> },
    { id: "predict", label: "趋势预测", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "analysis", label: "深度分析", icon: <Microscope className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold font-display flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                GamePulse · Demo
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {DEMO_PROFILE.filename} · {DEMO_PROFILE.rows} 行 × {DEMO_PROFILE.columns_count} 列 · 内置示例数据
              </p>
            </div>
            <span className="text-xs bg-warning/10 text-warning px-3 py-1 rounded-full font-medium">Demo 模式</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && <DashboardDemo />}
        {activeTab === "predict" && <PredictDemo />}
        {activeTab === "analysis" && <AnalysisDemo />}
      </div>
    </div>
  );
}

// ========== Dashboard ==========

function DashboardDemo() {
  const profile = DEMO_PROFILE;
  const preview = DEMO_PREVIEW;
  const dailyData = preview.rows;

  // Stats
  const avgDau = Math.round(dailyData.reduce((s, r) => s + r.dau, 0) / dailyData.length);
  const totalRevenue = dailyData.reduce((s, r) => s + r.revenue, 0);
  const avgRetention = +(dailyData.reduce((s, r) => s + r.retention_d1, 0) / dailyData.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "日均 DAU", value: avgDau.toLocaleString(), color: "text-primary" },
          { label: "总收入", value: `¥${Math.round(totalRevenue).toLocaleString()}`, color: "text-success" },
          { label: "D1 留存", value: `${avgRetention}%`, color: "text-warning" },
          { label: "数据天数", value: "90", color: "text-foreground" },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 glow-card">
            <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* DAU Trend */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">DAU 趋势（90天）</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} interval={13} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="dau" stroke="hsl(240 70% 60%)" strokeWidth={2} fill="url(#dauGrad)" name="DAU" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue + Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">收入趋势</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData.filter((_, i) => i % 3 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="hsl(142 60% 45%)" radius={[2, 2, 0, 0]} name="收入" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">D1 留存趋势</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} interval={13} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="retention_d1" stroke="hsl(47 90% 55%)" strokeWidth={2} dot={false} name="D1留存" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Field overview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium">字段概览</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-5 py-2.5 text-left text-muted-foreground">字段名</th>
              <th className="px-5 py-2.5 text-left text-muted-foreground">类型</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">均值</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">最小</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">最大</th>
            </tr>
          </thead>
          <tbody>
            {profile.columns.filter(c => c.dtype !== "object").map(col => (
              <tr key={col.name} className="border-b border-border/20 hover:bg-secondary/20">
                <td className="px-5 py-2.5 font-medium">{col.name}</td>
                <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">{col.dtype}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{col.mean}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{col.min}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{col.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Predict ==========

function PredictDemo() {
  const result = DEMO_PREDICT;
  const chartData = [
    ...result.historical.slice(-60).map(d => ({ date: d.date, actual: d.value, predicted: null, lower: null, upper: null })),
    ...result.predictions.map(d => ({ date: d.date, actual: null, predicted: d.value, lower: d.lower, upper: d.upper })),
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">预测方法</p>
          <p className="text-sm font-bold mt-1">{result.method}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">历史均值</p>
          <p className="text-2xl font-bold font-display">{result.history_stats.mean.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">历史趋势</p>
          <p className="text-sm font-bold mt-1">{result.history_stats.trend}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">预测趋势</p>
          <p className="text-sm font-bold mt-1 text-success">{result.forecast_stats.trend}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">DAU 趋势预测（30 天）</h3>
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
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} interval={14} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "12px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)" name="置信上界" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(240 10% 8%)" name="置信下界" />
              <Line type="monotone" dataKey="actual" stroke="hsl(240 5% 60%)" strokeWidth={2} dot={false} name="历史数据" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="hsl(240 70% 60%)" strokeWidth={2.5} strokeDasharray="5 3" dot={false} name="预测值" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 AI 洞察</h3>
        <div className="space-y-2">
          {result.insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== Analysis ==========

function AnalysisDemo() {
  const [activeAnalysis, setActiveAnalysis] = useState<"retention" | "correlation">("retention");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveAnalysis("retention")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeAnalysis === "retention" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <Activity className="w-4 h-4" /> 留存分析
        </button>
        <button
          onClick={() => setActiveAnalysis("correlation")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeAnalysis === "correlation" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          <GitBranch className="w-4 h-4" /> 相关性分析
        </button>
      </div>

      {activeAnalysis === "retention" && <RetentionDemo />}
      {activeAnalysis === "correlation" && <CorrelationDemo />}
    </div>
  );
}

function RetentionDemo() {
  const data = DEMO_RETENTION;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {data.milestones.map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-display">{m.avg_retention}%</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label} 留存</p>
          </div>
        ))}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{data.total_users.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">总用户</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">留存曲线</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.curve}>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="retention" stroke="hsl(240 70% 60%)" strokeWidth={2.5} dot={false} name="留存率" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 分析洞察</h3>
        <div className="space-y-2">
          {data.insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function CorrelationDemo() {
  const data = DEMO_CORRELATION;
  return (
    <div className="space-y-6">
      {data.strong_pairs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">强相关对</h3>
          <div className="space-y-2">
            {data.strong_pairs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <span className="text-sm font-medium">{p.col_a}</span>
                <span className="text-xs text-muted-foreground">↔</span>
                <span className="text-sm font-medium">{p.col_b}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-success/10 text-success">
                  r={p.correlation} ({p.strength})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-medium mb-3">相关性矩阵</h3>
        <table className="text-xs">
          <thead>
            <tr>
              <th className="p-2" />
              {data.columns.map(col => <th key={col} className="p-2 text-muted-foreground font-medium">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map(row => (
              <tr key={row.column}>
                <td className="p-2 text-muted-foreground font-medium">{row.column}</td>
                {data.columns.map(col => {
                  const val = row[col as keyof typeof row] as number;
                  const opacity = Math.abs(val) * 0.5;
                  const bg = val > 0 ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`;
                  return (
                    <td key={col} className="p-2 text-center font-mono" style={{ backgroundColor: bg }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 分析洞察</h3>
        <div className="space-y-2">
          {data.insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
