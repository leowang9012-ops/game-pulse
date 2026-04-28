import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProjectsPage } from "./pages/ProjectsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PredictPage } from "./pages/PredictPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DemoPage } from "./pages/DemoPage";
import "./index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="dashboard/demo" element={<DemoPage defaultTab="dashboard" />} />
        <Route path="predict/demo" element={<DemoPage defaultTab="predict" />} />
        <Route path="analyze/demo" element={<DemoPage defaultTab="analysis" />} />
        <Route path="dashboard/:projectId" element={<DashboardPage />} />
        <Route path="predict/:projectId" element={<PredictPage />} />
        <Route path="analyze/:projectId" element={<AnalysisPage />} />
      </Route>
    </Routes>
  );
}
