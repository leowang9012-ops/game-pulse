import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart3, ArrowLeft, TrendingUp, Database } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const API_BASE = "http://localhost:8001";

interface Profile {
  dataset_id: string;
  filename: string;
  rows: number;
  columns_count: number;
  columns: { name: string; dtype: string; null_pct: number; min?: number; max?: number; mean?: number; std?: number; unique_count?: number; is_date_candidate?: boolean }[];
  numeric_columns: string[];
  date_candidates: string[];
}

interface PreviewData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
}

export function DashboardPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!datasetId) return;
    Promise.all([
      fetch(`${API_BASE}/api/datasets/${datasetId}/profile`).then(r => r.json()),
      fetch(`${API_BASE}/api/datasets/${datasetId}/preview?rows=100`).then(r => r.json()),
    ]).then(([p, prev]) => {
      setProfile(p);
      setPreview(prev);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [datasetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载数据中...</p>
      </div>
    );
  }

  if (!profile || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">数据集不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> 返回
            </Link>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              {profile.filename}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{profile.rows.toLocaleString()} 行 × {profile.columns_count} 列</p>
          </div>
          <Link
            to={`/predict/${datasetId}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <TrendingUp className="w-4 h-4" /> 趋势预测
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
        {/* Numeric Column Distributions */}
        {profile.numeric_columns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profile.numeric_columns.map((col) => {
              const colInfo = profile.columns.find(c => c.name === col);
              if (!colInfo || colInfo.mean === undefined) return null;

              // Build histogram from preview data
              const values = preview.rows.map(r => Number(r[col])).filter(v => !isNaN(v));
              const bins = buildHistogram(values, 10);

              return (
                <div key={col} className="bg-card border border-border rounded-xl p-5 glow-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">{col}</h3>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                    <div><span className="text-muted-foreground">均值</span><p className="font-bold text-foreground">{colInfo.mean}</p></div>
                    <div><span className="text-muted-foreground">标准差</span><p className="font-bold text-foreground">{colInfo.std}</p></div>
                    <div><span className="text-muted-foreground">最小</span><p className="font-bold text-foreground">{colInfo.min}</p></div>
                    <div><span className="text-muted-foreground">最大</span><p className="font-bold text-foreground">{colInfo.max}</p></div>
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bins} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(240 10% 8%)",
                            border: "1px solid hsl(240 5% 20%)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "hsl(240 5% 90%)",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(240 70% 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Preview Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium">数据预览（前 {preview.rows.length} 行）</h3>
            <span className="text-xs text-muted-foreground">共 {preview.total.toLocaleString()} 行</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {preview.columns.map(col => (
                    <th key={col} className="px-4 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 30).map((row, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                    {preview.columns.map(col => (
                      <td key={col} className="px-4 py-2 whitespace-nowrap text-muted-foreground max-w-[200px] truncate">
                        {String(row[col] ?? "")}
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
    bins.push({ label: `${lo.toFixed(0)}`, count });
  }
  return bins;
}
