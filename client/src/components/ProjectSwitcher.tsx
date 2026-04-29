import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, FolderOpen, FileSpreadsheet } from "lucide-react";
import { getProjects, type Project } from "../lib/storage";
import { BUILTIN_PROJECTS } from "../data/builtin";

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
}

export function ProjectSwitcher({ currentId, currentPage }: { currentId: string; currentPage: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects().then(userProjects => {
      const list: ProjectItem[] = [
        ...BUILTIN_PROJECTS.map(p => ({ id: p.id, name: p.name, description: p.description, builtin: true })),
        ...userProjects.map(p => ({ id: p.id, name: p.name, description: `${p.filename || "未上传"} · ${p.rows}行`, builtin: false })),
      ];
      setItems(list);
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = items.find(i => i.id === currentId);
  const displayName = current?.name || currentId;

  const switchTo = (id: string) => {
    setOpen(false);
    navigate(`/${currentPage}/${id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">切换项目</div>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => switchTo(item.id)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-secondary/50 transition-colors ${
                item.id === currentId ? "bg-secondary/30" : ""
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.builtin ? "bg-primary/10" : "bg-secondary"
              }`}>
                <FileSpreadsheet className={`w-4 h-4 ${item.builtin ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              {item.id === currentId && (
                <span className="text-xs text-primary font-medium">当前</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
