import { Outlet, Link, useLocation } from "react-router-dom";
import { Activity, Upload, BarChart3, TrendingUp, Microscope } from "lucide-react";

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-card border-r border-border/60 flex flex-col z-40">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight font-display">GamePulse</h1>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">游戏数据脉搏</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { label: "项目列表", path: "/", icon: Upload },
            { label: "数据看板", path: "/dashboard/demo", icon: BarChart3, match: "/dashboard" },
            { label: "深度分析", path: "/analyze/demo", icon: Microscope, match: "/analyze" },
            { label: "趋势预测", path: "/predict/demo", icon: TrendingUp, match: "/predict" },
          ].map((item) => {
            const Icon = item.icon;
            const active = item.match
              ? location.pathname.startsWith(item.match)
              : location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <Icon className="w-[18px] h-[18px] opacity-70" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border/60">
          <p className="text-[10px] text-muted-foreground">v0.1.0 · MVP</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
