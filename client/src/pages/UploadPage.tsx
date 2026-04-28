import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "http://localhost:8001";

interface Profile {
  dataset_id: string;
  filename: string;
  rows: number;
  columns_count: number;
  columns: { name: string; dtype: string; null_pct: number; is_date_candidate?: boolean }[];
  numeric_columns: string[];
  date_candidates: string[];
}

export function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setProfile(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      alert(`上传失败: ${err}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          <h1 className="text-xl font-bold font-display">上传数据</h1>
          <p className="text-sm text-muted-foreground mt-1">上传 CSV / Excel 文件，自动识别字段并生成分析概览</p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-secondary/20"
          }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={onFileInput}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground">解析数据中...</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">拖拽文件到这里，或点击选择</p>
              <p className="text-sm text-muted-foreground mt-2">支持 CSV、Excel (.xlsx/.xls)、JSON 格式</p>
            </>
          )}
        </div>

        {/* Profile Result */}
        <AnimatePresence>
          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">数据解析成功</span>
              </div>

              {/* Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-2xl font-bold font-display">{profile.rows.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">数据行数</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-2xl font-bold font-display">{profile.columns_count}</p>
                  <p className="text-xs text-muted-foreground mt-1">字段数</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-2xl font-bold font-display">{profile.numeric_columns.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">数值字段</p>
                </div>
              </div>

              {/* Columns Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="text-sm font-medium">字段概览</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-5 py-2.5 text-left text-muted-foreground font-medium">字段名</th>
                      <th className="px-5 py-2.5 text-left text-muted-foreground font-medium">类型</th>
                      <th className="px-5 py-2.5 text-right text-muted-foreground font-medium">空值率</th>
                      <th className="px-5 py-2.5 text-center text-muted-foreground font-medium">日期候选</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.columns.map((col) => (
                      <tr key={col.name} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="px-5 py-2.5 font-medium">{col.name}</td>
                        <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">{col.dtype}</td>
                        <td className="px-5 py-2.5 text-right">
                          <span className={col.null_pct > 10 ? "text-warning" : "text-muted-foreground"}>
                            {col.null_pct}%
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          {col.is_date_candidate && <span className="text-primary">📅</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/dashboard/${profile.dataset_id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  进入看板 <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/predict/${profile.dataset_id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  开始预测 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
