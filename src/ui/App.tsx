import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Providers from "./pages/Providers";
import RoutesPage from "./pages/RoutesPage";
import Logs from "./pages/Logs";
import Test from "./pages/Test";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </Layout>
  );
}
