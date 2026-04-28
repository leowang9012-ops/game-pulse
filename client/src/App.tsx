import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PredictPage } from "./pages/PredictPage";
import "./index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<UploadPage />} />
        <Route path="dashboard/:datasetId" element={<DashboardPage />} />
        <Route path="predict/:datasetId" element={<PredictPage />} />
      </Route>
    </Routes>
  );
}
