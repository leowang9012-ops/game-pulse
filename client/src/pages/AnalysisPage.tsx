import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Microscope, ArrowLeft, Database, GitBranch } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

const tipStyle = { backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" } as const;

function loadProjectData(projectId: string) {
  try {
    const raw = localStorage.getItem(`gamepulse-data-${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as { headers: string[]; rows: Record<string, string>[] };
  } catch { return null; }
}

function getProjectName(projectId: string): string {
  try {
    const projects = JSON.parse(localStorage.getItem("gamepulse-projects") || "[]");
    return projects.find((p: { id: string }) => p.id === projectId)?.name || projectId;
  } catch { return projectId; }
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : +(num / denom).toFixed(3);
}

function detectAnomalies(values: number[]): { index: number; value: number; zscore: number }[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  if (std === 0) return [];
  return values
    .map((v, i) => ({ index: i, value: v, zscore: Math.abs((v - mean) / std) }))
    .filter(a => a.zscore > 2);
}

export function AnalysisPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"correlation" | "anomaly">("correlation");

  useEffect(() => {
    if (projectId) setData(loadProjectData(projectId));
  }, [projectId]);

  const numericCols = useMemo(() => {
    if (!data) return [];
    return data.headers.filter(h => {
      const vals = data.rows.map(r => Number(r[h])).filter(v => !isNaN(v));
      return vals.length > data.rows.length * 0.5;
    });
  }, [data]);

  const dateCol = useMemo(() => {
    if (!data) return null;
    for (const h of data.headers) {
      const sample = data.rows.slice(0, 5).map(r => r[h]);
      if (sample.every(v => !isNaN(Date.parse(v)))) return h;
    }
    return null;
  }, [data]);

  // Correlation matrix
  const correlationMatrix = useMemo(() => {
    if (numericCols.length < 2) return [];
    const matrix: { col1: string; col2: string; r: number }[] = [];
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const xs = data!.rows.map(r => Number(r[numericCols[i]])).filter(v => !isNaN(v));
        const ys = data!.rows.map(r => Number(r[numericCols[j]])).filter(v => !isNaN(v));
        const minLen = Math.min(xs.length, ys.length);
        const r = pearsonCorrelation(xs.slice(0, minLen), ys.slice(0, minLen));
        matrix.push({ col1: numericCols[i], col2: numericCols[j], r });
      }
    }
    return matrix.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  }, [numericCols, data]);

  // Anomaly detection for each numeric column
  const anomalies = useMemo(() => {
    if (!data || numericCols.length === 0) return {};
    const result: Record<string, { index: number; value: number; zscore: number }[]> = {};
    numericCols.forEach(col => {
      const vals = data.rows.map(r => Number(r[col])).filter(v => !isNaN(v));
      result[col] = detectAnomalies(vals);
    });
    return result;
  }, [data, numericCols]);

  // Time series for anomaly visualization
  const timeSeries = useMemo(() => {
    if (!data || !dateCol || numericCols.length === 0) return [];
    const sorted = [...data.rows].sort((a, b) => new Date(a[dateCol]).getTime() - new Date(b[dateCol]).getTime());
    return sorted.map((r, i) => {
      const point: Record<string, unknown> = { date: r[dateCol], index: i };
      numericCols.forEach(c => { point[c] = Number(r[c]) || 0; });
      return point;
    });
  }, [data, dateCol, numericCols]);

  const projectName = projectId ? getProjectName(projectId) : "";

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
            <Microscope className="w-5 h-5 text-primary" />
            深度分析 · {projectName}
          </h1>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("correlation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "correlation" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            <GitBranch className="w-4 h-4" /> 相关性分析
          </button>
          <button
            onClick={() => setActiveTab("anomaly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "anomaly" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            <Database className="w-4 h-4" /> 异常检测
          </button>
        </div>

        {/* Correlation */}
        {activeTab === "correlation" && (
          <div className="space-y-6">
            {correlationMatrix.length > 0 ? (
              <>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-4">相关性矩阵（Top 强相关）</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={correlationMatrix.slice(0, 15).map(c => ({
                        name: `${c.col1} ↔ ${c.col2}`,
                        r: Math.abs(c.r),
                        fullR: c.r,
                      }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" />
                        <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                        <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} />
                        <Tooltip
                          contentStyle={tipStyle}
                          formatter={(value: unknown) => [`${value}`, "相关系数 |r|"]}
                        />
                        <Bar dataKey="r" radius={[0, 4, 4, 0]}>
                          {correlationMatrix.slice(0, 15).map((entry, index) => (
                            <Cell key={index} fill={Math.abs(entry.r) > 0.7 ? "hsl(0 70% 60%)" : Math.abs(entry.r) > 0.4 ? "hsl(47 90% 55%)" : "hsl(240 70% 60%)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-medium">相关性详情</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-5 py-2.5 text-left text-muted-foreground">字段 1</th>
                        <th className="px-5 py-2.5 text-left text-muted-foreground">字段 2</th>
                        <th className="px-5 py-2.5 text-right text-muted-foreground">相关系数 r</th>
                        <th className="px-5 py-2.5 text-center text-muted-foreground">强度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correlationMatrix.map((c, i) => {
                        const absR = Math.abs(c.r);
                        const strength = absR > 0.7 ? "强" : absR > 0.4 ? "中" : "弱";
                        const color = absR > 0.7 ? "text-destructive" : absR > 0.4 ? "text-warning" : "text-muted-foreground";
                        return (
                          <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                            <td className="px-5 py-2.5 font-medium">{c.col1}</td>
                            <td className="px-5 py-2.5 font-medium">{c.col2}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{c.r}</td>
                            <td className={`px-5 py-2.5 text-center font-medium ${color}`}>{strength}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">需要至少 2 个数值字段才能进行相关性分析</p>
            )}
          </div>
        )}

        {/* Anomaly Detection */}
        {activeTab === "anomaly" && (
          <div className="space-y-6">
            {timeSeries.length > 0 && numericCols.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-medium mb-4">趋势图（异常点标红）</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tipStyle} />
                      <Line type="monotone" dataKey={numericCols[0]} stroke="hsl(240 70% 60%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {Object.entries(anomalies).map(([col, items]) => (
              items.length > 0 && (
                <div key={col} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">{col} — {items.length} 个异常值</h3>
                  <div className="space-y-1">
                    {items.slice(0, 10).map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/20">
                        <span className="text-muted-foreground">第 {a.index + 1} 行</span>
                        <span className="font-medium">{a.value}</span>
                        <span className="text-destructive text-xs">Z={a.zscore.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
