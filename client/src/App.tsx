import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PredictPage } from "./pages/PredictPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { DemoPage } from "./pages/DemoPage";
import "./index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DemoPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="dashboard/demo" element={<DemoPage defaultTab="dashboard" />} />
        <Route path="predict/demo" element={<DemoPage defaultTab="predict" />} />
        <Route path="analyze/demo" element={<DemoPage defaultTab="analysis" />} />
        <Route path="dashboard/:datasetId" element={<DashboardPage />} />
        <Route path="predict/:datasetId" element={<PredictPage />} />
        <Route path="analyze/:datasetId" element={<AnalysisPage />} />
      </Route>
    </Routes>
  );
}
