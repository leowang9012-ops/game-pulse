import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart3, ArrowLeft, TrendingUp, Database, Microscope } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const tipStyle = { backgroundColor: "hsl(240 10% 8%)", border: "1px solid hsl(240 5% 20%)", borderRadius: "8px", fontSize: "12px" } as const;

interface ProjectData {
  headers: string[];
  rows: Record<string, string>[];
}

function loadProjectData(projectId: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(`gamepulse-data-${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function getProjectName(projectId: string): string {
  try {
    const projects = JSON.parse(localStorage.getItem("gamepulse-projects") || "[]");
    return projects.find((p: { id: string }) => p.id === projectId)?.name || projectId;
  } catch { return projectId; }
}

function detectNumericColumns(headers: string[], rows: Record<string, string>[]): string[] {
  return headers.filter(h => {
    const vals = rows.map(r => Number(r[h])).filter(v => !isNaN(v));
    return vals.length > rows.length * 0.5;
  });
}

function detectDateColumn(headers: string[], rows: Record<string, string>[]): string | null {
  for (const h of headers) {
    const sample = rows.slice(0, 5).map(r => r[h]);
    const isDate = sample.every(v => !isNaN(Date.parse(v)));
    if (isDate && sample.length > 0) return h;
  }
  return null;
}

function computeStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean: +mean.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2), std: +Math.sqrt(variance).toFixed(2) };
}

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const d = loadProjectData(projectId);
    setData(d);
  }, [projectId]);

  const numericCols = useMemo(() => data ? detectNumericColumns(data.headers, data.rows) : [], [data]);
  const dateCol = useMemo(() => data ? detectDateColumn(data.headers, data.rows) : null, [data]);
  const projectName = projectId ? getProjectName(projectId) : "";

  // Build time series if date column exists
  const timeSeries = useMemo(() => {
    if (!data || !dateCol || numericCols.length === 0) return [];
    const sorted = [...data.rows].sort((a, b) => new Date(a[dateCol]).getTime() - new Date(b[dateCol]).getTime());
    return sorted.map(r => {
      const point: Record<string, unknown> = { date: r[dateCol] };
      numericCols.forEach(c => { point[c] = Number(r[c]) || 0; });
      return point;
    });
  }, [data, dateCol, numericCols]);

  if (!projectId) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">请选择项目</div>;
  }

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
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> 返回项目列表
            </Link>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              {projectName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{data.rows.length} 行 × {data.headers.length} 列</p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/analyze/${projectId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80"
            >
              <Microscope className="w-4 h-4" /> 深度分析
            </Link>
            <Link
              to={`/predict/${projectId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <TrendingUp className="w-4 h-4" /> 趋势预测
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* KPI Summary */}
        {numericCols.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {numericCols.slice(0, 4).map(col => {
              const vals = data.rows.map(r => Number(r[col])).filter(v => !isNaN(v));
              const stats = computeStats(vals);
              return (
                <div key={col} className="bg-card border border-border rounded-xl p-5">
                  <p className="text-2xl font-bold font-display">{stats.mean.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{col}（均值）</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Time Series Chart */}
        {timeSeries.length > 0 && numericCols.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">趋势图</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(240 70% 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(240 70% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke="hsl(240 5% 16%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tipStyle} />
                  <Area type="monotone" dataKey={numericCols[0]} stroke="hsl(240 70% 60%)" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Numeric Distributions */}
        {numericCols.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {numericCols.map(col => {
              const vals = data.rows.map(r => Number(r[col])).filter(v => !isNaN(v));
              const stats = computeStats(vals);
              const bins = buildHistogram(vals, 10);
              return (
                <div key={col} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-medium mb-3">{col}</h3>
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div><span className="text-muted-foreground">均值</span><p className="font-bold">{stats.mean}</p></div>
                    <div><span className="text-muted-foreground">标准差</span><p className="font-bold">{stats.std}</p></div>
                    <div><span className="text-muted-foreground">最小</span><p className="font-bold">{stats.min}</p></div>
                    <div><span className="text-muted-foreground">最大</span><p className="font-bold">{stats.max}</p></div>
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bins}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(240 5% 45%)" }} />
                        <Tooltip contentStyle={tipStyle} />
                        <Bar dataKey="count" fill="hsl(240 70% 60%)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium">数据预览</h3>
            <span className="text-xs text-muted-foreground">共 {data.rows.length} 行</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {data.headers.map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                    {data.headers.map(h => (
                      <td key={h} className="px-4 py-2 whitespace-nowrap text-muted-foreground max-w-[200px] truncate">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildHistogram(values: number[], binCount: number) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / binCount || 1;
  const bins: { label: string; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const lo = min + i * step;
    const hi = lo + step;
    const count = values.filter(v => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
    bins.push({ label: lo.toFixed(0), count });
  }
  return bins;
}
