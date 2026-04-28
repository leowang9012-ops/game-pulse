import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, FolderOpen, Trash2, BarChart3, TrendingUp,
  Microscope, FileSpreadsheet, Clock
} from "lucide-react";
import {
  getProjects, saveProject, deleteProject as deleteProj,
  saveProjectData, parseCSV, readFileWithEncoding, type Project
} from "../lib/storage";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects().then(p => { setProjects(p); setLoading(false); });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const text = await readFileWithEncoding(file);
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) throw new Error("无法解析文件，请确认是 CSV 格式");

      const id = `proj_${Date.now()}`;
      const project: Project = {
        id,
        name: file.name.replace(/\.(csv|xlsx?|json)$/i, ""),
        filename: file.name,
        rows: rows.length,
        columns: headers,
        createdAt: new Date().toISOString(),
      };

      await saveProjectData({ id, headers, rows });
      await saveProject(project);
      setProjects(prev => [project, ...prev]);
    } catch (err) {
      alert(`上传失败: ${err}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此项目？")) return;
    await deleteProj(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          <h1 className="text-xl font-bold font-display">项目列表</h1>
          <p className="text-sm text-muted-foreground mt-1">上传数据文件，每个项目独立分析</p>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">
        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
          onClick={() => document.getElementById("upload-input")?.click()}
        >
          <input
            id="upload-input"
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-muted-foreground">解析中...</p>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">拖拽 CSV 文件到这里，或点击选择</p>
              <p className="text-xs text-muted-foreground mt-1">支持大文件（最大 50MB）</p>
            </>
          )}
        </div>

        {/* Demo Project */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">示例项目</h2>
          <div
            onClick={() => navigate("/dashboard/demo")}
            className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">街篮2 · Q1 2024 运营数据</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  91天 · DAU/收入/ARPU/留存 · 真实样本
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg">
                <BarChart3 className="w-3 h-3" /> 看板
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg">
                <TrendingUp className="w-3 h-3" /> 预测
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg">
                <Microscope className="w-3 h-3" /> 分析
              </button>
            </div>
          </div>
        </div>

        {/* User Projects */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">我的项目</h2>
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:border-primary/40 transition-colors group"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => navigate(`/dashboard/${p.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.rows.toLocaleString()} 行 · {p.columns.length} 列 · {p.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/${p.id}`); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10"
                  >
                    <BarChart3 className="w-3 h-3" /> 看板
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/predict/${p.id}`); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10"
                  >
                    <TrendingUp className="w-3 h-3" /> 预测
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/analyze/${p.id}`); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10"
                  >
                    <Microscope className="w-3 h-3" /> 分析
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>还没有上传的项目</p>
            <p className="text-xs mt-1">上传 CSV 文件开始分析</p>
          </div>
        )}
      </div>
    </div>
  );
}
