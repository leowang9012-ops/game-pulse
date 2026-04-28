import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart3, ArrowLeft, Loader2, TrendingUp, AlertTriangle, GitBranch, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell
} from "recharts";

const API_BASE = "http://localhost:8001";

interface Profile {
  dataset_id: string;
  filename: string;
  columns: { name: string; dtype: string; is_date_candidate?: boolean }[];
  numeric_columns: string[];
  date_candidates: string[];
}

type AnalysisType = "retention" | "revenue" | "correlation" | "anomaly";

export function AnalysisPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisType>("retention");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // Form states
  const [userCol, setUserCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [corrCols, setCorrCols] = useState<string[]>([]);
  const [anomalyCol, setAnomalyCol] = useState("");

  useEffect(() => {
    if (!datasetId) return;
    fetch(`${API_BASE}/api/datasets/${datasetId}/profile`)
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p);
        if (p.date_candidates.length > 0) setDateCol(p.date_candidates[0]);
        if (p.numeric_columns.length > 0) {
          setUserCol(p.numeric_columns[0]);
          setAmountCol(p.numeric_columns[0]);
          setAnomalyCol(p.numeric_columns[0]);
          setCorrCols(p.numeric_columns.slice(0, Math.min(5, p.numeric_columns.length)));
        }
      });
  }, [datasetId]);

  const runAnalysis = async () => {
    if (!datasetId) return;
    setLoading(true);
    setResult(null);

    try {
      let body: Record<string, unknown> = { dataset_id: datasetId };
      let endpoint = "";

      switch (activeTab) {
        case "retention":
          endpoint = "retention";
          body = { ...body, user_column: userCol, date_column: dateCol };
          break;
        case "revenue":
          endpoint = "revenue";
          body = { ...body, user_column: userCol, amount_column: amountCol, date_column: dateCol || undefined };
          break;
        case "correlation":
          endpoint = "correlation";
          body = { ...body, columns: corrCols };
          break;
        case "anomaly":
          endpoint = "anomaly";
          body = { ...body, value_column: anomalyCol, method: "iqr" };
          break;
      }

      const res = await fetch(`${API_BASE}/api/analyze/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err) {
      alert(`分析失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: AnalysisType; label: string; icon: React.ReactNode }[] = [
    { id: "retention", label: "留存分析", icon: <Activity className="w-4 h-4" /> },
    { id: "revenue", label: "收入指标", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "correlation", label: "相关性", icon: <GitBranch className="w-4 h-4" /> },
    { id: "anomaly", label: "异常检测", icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <Link to={`/dashboard/${datasetId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回看板
          </Link>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            深度分析
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">留存、收入、相关性、异常值 — 游戏数据专项分析</p>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
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

        {/* Config Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex flex-wrap items-end gap-4">
            {activeTab === "retention" && (
              <>
                <SelectCol label="用户ID列" value={userCol} onChange={setUserCol} profile={profile} />
                <SelectCol label="日期列" value={dateCol} onChange={setDateCol} profile={profile} showDateOnly />
              </>
            )}
            {activeTab === "revenue" && (
              <>
                <SelectCol label="用户ID列" value={userCol} onChange={setUserCol} profile={profile} />
                <SelectCol label="金额列" value={amountCol} onChange={setAmountCol} profile={profile} numericOnly />
                <SelectCol label="日期列（可选）" value={dateCol} onChange={setDateCol} profile={profile} showDateOnly allowEmpty />
              </>
            )}
            {activeTab === "correlation" && (
              <MultiSelectCol label="选择数值列" values={corrCols} onChange={setCorrCols} profile={profile} />
            )}
            {activeTab === "anomaly" && (
              <SelectCol label="检测列" value={anomalyCol} onChange={setAnomalyCol} profile={profile} numericOnly />
            )}

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {loading ? "分析中..." : "开始分析"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && !("error" in result) && (
          <>
            {activeTab === "retention" && <RetentionResult data={result} />}
            {activeTab === "revenue" && <RevenueResult data={result} />}
            {activeTab === "correlation" && <CorrelationResult data={result} />}
            {activeTab === "anomaly" && <AnomalyResult data={result} />}
          </>
        )}
        {result && "error" in result && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 text-destructive text-sm">
            {(result as Record<string, unknown>).error as string}
          </div>
        )}
      </div>
    </div>
  );
}

// === Helper Components ===

function SelectCol({ label, value, onChange, profile, numericOnly, showDateOnly, allowEmpty }: {
  label: string; value: string; onChange: (v: string) => void; profile: Profile | null;
  numericOnly?: boolean; showDateOnly?: boolean; allowEmpty?: boolean;
}) {
  let cols = profile?.columns || [];
  if (numericOnly) cols = cols.filter(c => c.dtype === "int64" || c.dtype === "float64");
  if (showDateOnly) cols = cols.filter(c => c.is_date_candidate || c.dtype === "object");

  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-w-[160px]">
        {allowEmpty && <option value="">不选择</option>}
        {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
    </div>
  );
}

function MultiSelectCol({ label, values, onChange, profile }: {
  label: string; values: string[]; onChange: (v: string[]) => void; profile: Profile | null;
}) {
  const toggle = (col: string) => {
    if (values.includes(col)) onChange(values.filter(v => v !== col));
    else onChange([...values, col]);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {(profile?.numeric_columns || []).map(col => (
          <button
            key={col}
            onClick={() => toggle(col)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              values.includes(col)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {col}
          </button>
        ))}
      </div>
    </div>
  );
}

// === Result Components ===

function RetentionResult({ data }: { data: Record<string, unknown> }) {
  const d = data as { curve: { day: number; retention: number }[]; milestones: { label: string; avg_retention: number }[]; total_users: number; insights: string[] };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="总用户" value={d.total_users.toLocaleString()} />
        {(d.milestones || []).slice(0, 3).map(m => (
          <StatCard key={m.label} label={`${m.label} 留存`} value={`${m.avg_retention}%`} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">留存曲线</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.curve}>
              <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(240 5% 90%)" }} />
              <Line type="monotone" dataKey="retention" stroke="hsl(240 70% 60%)" strokeWidth={2.5} dot={false} name="留存率" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <InsightsPanel insights={d.insights} />
    </div>
  );
}

function RevenueResult({ data }: { data: Record<string, unknown> }) {
  const d = data as { total_revenue: number; arpu: number; arppu: number; pay_rate: number; paying_users: number; total_users: number; tier_distribution: Record<string, number>; insights: string[] };
  const tierData = Object.entries(d.tier_distribution || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="总收入" value={`¥${d.total_revenue.toLocaleString()}`} />
        <StatCard label="ARPU" value={`¥${d.arpu}`} />
        <StatCard label="ARPPU" value={`¥${d.arppu}`} />
        <StatCard label="付费率" value={`${d.pay_rate}%`} />
        <StatCard label="付费用户" value={`${d.paying_users} / ${d.total_users}`} />
      </div>

      {tierData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4">付费分层分布</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(240 5% 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" name="用户数" radius={[4, 4, 0, 0]}>
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={["hsl(240 5% 50%)", "hsl(142 60% 45%)", "hsl(47 90% 55%)", "hsl(240 70% 60%)", "hsl(0 70% 55%)"][i] || "hsl(240 70% 60%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <InsightsPanel insights={d.insights} />
    </div>
  );
}

function CorrelationResult({ data }: { data: Record<string, unknown> }) {
  const d = data as { matrix: Record<string, unknown>[]; columns: string[]; strong_pairs: { col_a: string; col_b: string; correlation: number; strength: string }[]; insights: string[] };

  return (
    <div className="space-y-6">
      {d.strong_pairs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium mb-3">强相关对</h3>
          <div className="space-y-2">
            {d.strong_pairs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <span className="text-sm font-medium">{p.col_a}</span>
                <span className="text-xs text-muted-foreground">↔</span>
                <span className="text-sm font-medium">{p.col_b}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded ${p.correlation > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  r={p.correlation} ({p.strength})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Heatmap Table */}
      <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-medium mb-3">相关性矩阵</h3>
        <table className="text-xs">
          <thead>
            <tr>
              <th className="p-2" />
              {d.columns.map(col => <th key={col} className="p-2 text-muted-foreground font-medium truncate max-w-[100px]">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {d.matrix.map((row: Record<string, unknown>) => (
              <tr key={row.column as string}>
                <td className="p-2 text-muted-foreground font-medium">{row.column as string}</td>
                {d.columns.map(col => {
                  const val = row[col] as number;
                  const bg = val > 0 ? `rgba(34, 197, 94, ${Math.abs(val) * 0.5})` : `rgba(239, 68, 68, ${Math.abs(val) * 0.5})`;
                  return (
                    <td key={col} className="p-2 text-center" style={{ backgroundColor: bg }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightsPanel insights={d.insights} />
    </div>
  );
}

function AnomalyResult({ data }: { data: Record<string, unknown> }) {
  const d = data as { total: number; anomaly_count: number; anomaly_pct: number; bounds: { lower: number; upper: number }; mean: number; std: number; anomaly_values: { index: number; value: number }[]; method: string };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="总数据" value={d.total.toLocaleString()} />
        <StatCard label="异常数" value={d.anomaly_count.toString()} accent />
        <StatCard label="异常率" value={`${d.anomaly_pct}%`} accent />
        <StatCard label="正常范围" value={`[${d.bounds.lower}, ${d.bounds.upper}]`} />
        <StatCard label="均值 ± 标准差" value={`${d.mean} ± ${d.std}`} />
      </div>

      {d.anomaly_values.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium">异常值列表（前 {d.anomaly_values.length} 个）</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-2 text-left text-muted-foreground">行号</th>
                <th className="px-5 py-2 text-right text-muted-foreground">值</th>
              </tr>
            </thead>
            <tbody>
              {d.anomaly_values.map(v => (
                <tr key={v.index} className="border-b border-border/20 hover:bg-secondary/20">
                  <td className="px-5 py-2 text-muted-foreground">#{v.index}</td>
                  <td className="px-5 py-2 text-right font-mono text-destructive">{v.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className={`text-2xl font-bold font-display ${accent ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: string[] }) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        💡 分析洞察
      </h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
        ))}
      </div>
    </div>
  );
}
