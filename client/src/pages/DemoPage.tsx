import { useState, useMemo } from "react";
import {
  Activity, TrendingUp, Database, Microscope, GitBranch
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts";
import {
  STATS, DAILY_OPS, RETENTION_HISTORY, CHANNEL_RETENTION
} from "@/data/realData";

type Tab = "dashboard" | "predict" | "analysis";

const tipStyle = { backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" } as const;

export function DemoPage({ defaultTab }: { defaultTab?: Tab } = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab || "dashboard");
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "数据看板", icon: <Database className="w-4 h-4" /> },
    { id: "predict", label: "趋势预测", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "analysis", label: "深度分析", icon: <Microscope className="w-4 h-4" /> },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold font-display flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                GamePulse · 街篮2
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Q1 2024 运营数据 · {STATS.days} 天 · 真实样本
              </p>
            </div>
            <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full font-medium">真实数据</span>
          </div>
        </div>
      </header>
      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "predict" && <PredictTab />}
        {activeTab === "analysis" && <AnalysisTab />}
      </div>
    </div>
  );
}

// ========== Dashboard ==========
function DashboardTab() {
  const daily = DAILY_OPS;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "日均 DAU", value: STATS.dau_mean.toLocaleString(), color: "text-primary" },
          { label: "总收入", value: `¥${STATS.rev_total.toLocaleString()}`, color: "text-success" },
          { label: "ARPU", value: `¥${STATS.arpu_mean}`, color: "text-warning" },
          { label: "付费率", value: `${STATS.pay_rate_mean}%`, color: "text-foreground" },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">DAU 趋势（{STATS.days}天）</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} interval={13} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="dau" stroke="hsl(240 70% 60%)" strokeWidth={2} fill="url(#dauGrad)" name="DAU" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">收入趋势</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily.filter((_, i) => i % 2 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(240 5% 45%)" }} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="revenue" fill="hsl(142 60% 45%)" radius={[2, 2, 0, 0]} name="收入" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">ARPU / ARPPU 趋势</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.filter((_, i) => i % 2 === 0)}>
                <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(240 5% 45%)" }} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="arpu" stroke="hsl(47 90% 55%)" strokeWidth={2} dot={false} name="ARPU" />
                <Line type="monotone" dataKey="arppu" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={false} name="ARPPU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium">指标概览</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-5 py-2.5 text-left text-muted-foreground">指标</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">均值</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">最小</th>
              <th className="px-5 py-2.5 text-right text-muted-foreground">最大</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "DAU", val: DAILY_OPS.map(r => r.dau) },
              { label: "收入 (¥)", val: DAILY_OPS.map(r => r.revenue) },
              { label: "ARPU (¥)", val: DAILY_OPS.map(r => r.arpu) },
              { label: "ARPPU (¥)", val: DAILY_OPS.map(r => r.arppu) },
              { label: "付费率", val: DAILY_OPS.map(r => r.pay_rate) },
              { label: "新增用户", val: DAILY_OPS.map(r => r.new_users) },
            ].map((row, i) => {
              const vals = row.val.filter(v => v != null) as number[];
              const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
              const min = Math.min(...vals);
              const max = Math.max(...vals);
              const fmt = (v: number) => row.label.includes("付费率") ? (v * 100).toFixed(1) + "%" : v < 100 ? v.toFixed(1) : Math.round(v).toLocaleString();
              return (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                  <td className="px-5 py-2.5 font-medium">{row.label}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmt(mean)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmt(min)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmt(max)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Predict ==========
function PredictTab() {
  const chartData = useMemo(() => {
    const daily = DAILY_OPS.slice(-60);
    // Simple moving average prediction
    const window = 7;
    const recent = daily.slice(-window);
    const avg = recent.reduce((s, r) => s + r.dau, 0) / recent.length;
    const trend = (daily[daily.length - 1].dau - daily[0].dau) / daily.length;
    const predictions = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(daily[daily.length - 1].date);
      date.setDate(date.getDate() + i + 1);
      const val = Math.round(avg + trend * (i + 1));
      const noise = Math.round(val * 0.08);
      return {
        date: date.toISOString().split("T")[0],
        actual: null, predicted: val, lower: val - noise, upper: val + noise,
      };
    });
    return [
      ...daily.map(d => ({ date: d.date, actual: d.dau, predicted: null, lower: null, upper: null })),
      ...predictions,
    ];
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">预测方法</p>
          <p className="text-sm font-bold mt-1">移动平均 + 线性趋势</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">DAU 均值</p>
          <p className="text-2xl font-bold font-display">{STATS.dau_mean.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">DAU 范围</p>
          <p className="text-sm font-bold mt-1">{STATS.dau_min.toLocaleString()} ~ {STATS.dau_max.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">数据稳定性</p>
          <p className="text-sm font-bold mt-1 text-success">CV 8.4%（稳定）</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">DAU 趋势 + 30 天预测</h3>
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
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} interval={13} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confBand)" name="置信上界" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(240 10% 8%)" name="置信下界" />
              <Line type="monotone" dataKey="actual" stroke="hsl(240 5% 60%)" strokeWidth={2} dot={false} name="历史" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="hsl(240 70% 60%)" strokeWidth={2.5} strokeDasharray="5 3" dot={false} name="预测" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 洞察</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>📊 DAU 波动较小（CV 8.4%），整体稳定在 {STATS.dau_min.toLocaleString()}~{STATS.dau_max.toLocaleString()}</p>
          <p>⚠️ 收入波动巨大（CV 98.9%），日均 ¥{STATS.rev_mean.toLocaleString()}，但个别天可达 ¥370,000+</p>
          <p>🔗 收入↔ARPU 强相关（r=0.99），收入增长靠人均付费而非用户量</p>
          <p>👥 官方渠道 D30 留存 {STATS.ch_official}%，远高于渠道用户 {STATS.ch_channel}%</p>
        </div>
      </div>
    </div>
  );
}

// ========== Analysis ==========
function AnalysisTab() {
  const [active, setActive] = useState<"retention" | "correlation">("retention");
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setActive("retention")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            active === "retention" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}>
          <Activity className="w-4 h-4" /> 留存趋势
        </button>
        <button onClick={() => setActive("correlation")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            active === "correlation" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          }`}>
          <GitBranch className="w-4 h-4" /> 渠道对比
        </button>
      </div>
      {active === "retention" && <RetentionPanel />}
      {active === "correlation" && <ChannelPanel />}
    </div>
  );
}

function RetentionPanel() {
  const ret = RETENTION_HISTORY;
  const avg30 = ret.filter(r => r.retention_30 != null).reduce((s, r) => s + (r.retention_30 || 0), 0) / ret.filter(r => r.retention_30 != null).length;
  const avg60 = ret.filter(r => r.retention_60 != null).reduce((s, r) => s + (r.retention_60 || 0), 0) / ret.filter(r => r.retention_60 != null).length;
  const avg90 = ret.filter(r => r.retention_90 != null).reduce((s, r) => s + (r.retention_90 || 0), 0) / ret.filter(r => r.retention_90 != null).length;
  const totalNew = ret.reduce((s, r) => s + r.new_users, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{avg30.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">D30 留存均值</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{avg60.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">D60 留存均值</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{avg90.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">D90 留存均值</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-display">{(totalNew / 10000).toFixed(0)}万</p>
          <p className="text-xs text-muted-foreground mt-1">总新增用户</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">留存率趋势（2020-2021 月度）</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ret.filter(r => r.retention_30 != null)}>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} interval={5} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} unit="%" />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="retention_30" stroke="hsl(240 70% 60%)" strokeWidth={2} dot={false} name="D30" />
              <Line type="monotone" dataKey="retention_60" stroke="hsl(47 90% 55%)" strokeWidth={2} dot={false} name="D60" />
              <Line type="monotone" dataKey="retention_90" stroke="hsl(142 60% 45%)" strokeWidth={2} dot={false} name="D90" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 洞察</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>📈 D30 留存 2020→2021 提升 {STATS.ret30_2021 - STATS.ret30_2020}pp（{STATS.ret30_2020}%→{STATS.ret30_2021}%）</p>
          <p>👥 官方渠道 D30 留存 {STATS.ch_official}%，是渠道用户 {STATS.ch_channel}% 的 {(STATS.ch_official / STATS.ch_channel).toFixed(1)} 倍</p>
          <p>📉 2021年新增 302 万，比2020年（388万）下降 22%</p>
          <p>⚠️ D90 长期留存偏低（均值 {avg90.toFixed(1)}%），长期留存是核心挑战</p>
        </div>
      </div>
    </div>
  );
}

function ChannelPanel() {
  const channels = CHANNEL_RETENTION;
  const official = channels.filter(c => c.channel === "官方");
  const external = channels.filter(c => c.channel === "渠道");
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-2xl font-bold font-display text-primary">{STATS.ch_official}%</p>
          <p className="text-xs text-muted-foreground mt-1">官方渠道 D30 留存均值</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-2xl font-bold font-display text-warning">{STATS.ch_channel}%</p>
          <p className="text-xs text-muted-foreground mt-1">外部渠道 D30 留存均值</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">渠道留存对比（D30 月度趋势）</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={channels.filter(c => c.retention_30 != null)}>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} interval={5} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} unit="%" />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="retention_30" stroke="hsl(240 70% 60%)" strokeWidth={2} dot={false} name="D30留存" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">💡 渠道洞察</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>🏆 官方渠道 D30 留存 {STATS.ch_official}%，远高于外部渠道的 {STATS.ch_channel}%</p>
          <p>💡 外部渠道拉新量大但留存差，建议优化渠道筛选和新用户引导</p>
          <p>📊 官方渠道用户质量是外部的 {(STATS.ch_official / STATS.ch_channel).toFixed(1)} 倍，值得加大官方推广投入</p>
        </div>
      </div>
    </div>
  );
}
