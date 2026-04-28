import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Upload, Trash2, BarChart3, TrendingUp,
  Microscope, FileSpreadsheet, FolderOpen, X, Check
} from "lucide-react";
import {
  getProjects, saveProject, deleteProject as deleteProj,
  saveProjectData, parseCSV, readFileWithEncoding, type Project
} from "../lib/storage";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { getProjects().then(setProjects); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project: Project = {
      id: `proj_${Date.now()}`,
      name: newName.trim(),
      filename: "",
      rows: 0,
      columns: [],
      createdAt: new Date().toISOString(),
    };
    await saveProject(project);
    setProjects(prev => [project, ...prev]);
    setNewName("");
    setShowCreate(false);
  };

  const handleUpload = useCallback(async (projectId: string, file: File) => {
    setUploadingTo(projectId);
    try {
      const text = await readFileWithEncoding(file);
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) throw new Error("无法解析文件");

      await saveProjectData({ id: projectId, headers, rows });

      // Update project metadata
      const updated = projects.find(p => p.id === projectId);
      if (updated) {
        const proj = { ...updated, filename: file.name, rows: rows.length, columns: headers };
        await saveProject(proj);
        setProjects(prev => prev.map(p => p.id === projectId ? proj : p));
      }
    } catch (err) {
      alert(`上传失败: ${err}`);
    } finally {
      setUploadingTo(null);
    }
  }, [projects]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此项目？")) return;
    await deleteProj(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display">项目管理</h1>
            <p className="text-sm text-muted-foreground mt-1">创建项目，上传数据，开始分析</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6">
        {/* Demo Project */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">示例项目</h2>
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
                <p className="text-xs text-muted-foreground mt-0.5">91天 · DAU/收入/ARPU/留存</p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-3 py-1.5 text-xs bg-secondary rounded-lg flex items-center gap-1"><BarChart3 className="w-3 h-3" /> 看板</span>
              <span className="px-3 py-1.5 text-xs bg-secondary rounded-lg flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 预测</span>
              <span className="px-3 py-1.5 text-xs bg-secondary rounded-lg flex items-center gap-1"><Microscope className="w-3 h-3" /> 分析</span>
            </div>
          </div>
        </div>

        {/* User Projects */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">我的项目</h2>
          {projects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">还没有项目</p>
              <p className="text-xs mt-1">点击「新建项目」开始</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  uploading={uploadingTo === p.id}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-[400px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">新建项目</h3>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="项目名称"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary">取消</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project, uploading, onUpload, onDelete, onNavigate
}: {
  project: Project;
  uploading: boolean;
  onUpload: (projectId: string, file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const hasData = project.rows > 0;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${hasData ? "border-border hover:border-primary/40" : "border-warning/30"}`}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasData ? "bg-secondary" : "bg-warning/10"}`}>
            {hasData ? <FileSpreadsheet className="w-5 h-5 text-muted-foreground" /> : <Upload className="w-5 h-5 text-warning" />}
          </div>
          <div>
            <p className="font-medium">{project.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasData
                ? `${project.filename} · ${project.rows.toLocaleString()} 行 · ${project.columns.length} 列`
                : "未上传数据"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasData ? (
            <>
              <button onClick={() => onNavigate(`/dashboard/${project.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10 transition-colors">
                <BarChart3 className="w-3 h-3" /> 数据看板
              </button>
              <button onClick={() => onNavigate(`/predict/${project.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10 transition-colors">
                <TrendingUp className="w-3 h-3" /> 趋势预测
              </button>
              <button onClick={() => onNavigate(`/analyze/${project.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10 transition-colors">
                <Microscope className="w-3 h-3" /> 深度分析
              </button>
              {/* Re-upload */}
              <label className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                <Upload className="w-3 h-3" /> 更新数据
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(project.id, f);
                  e.target.value = "";
                }} />
              </label>
            </>
          ) : (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) onUpload(project.id, file);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                uploading
                  ? "bg-secondary text-muted-foreground"
                  : dragOver
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {uploading ? (
                <><span className="animate-spin">⏳</span> 解析中...</>
              ) : (
                <><Upload className="w-4 h-4" /> 上传 CSV</>
              )}
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                if (f) onUpload(project.id, f);
                e.target.value = "";
              }} />
            </label>
          )}
          <button onClick={() => onDelete(project.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
