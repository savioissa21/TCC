import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ui/ToastContainer";
import { PrivateRoute } from "./routes/PrivateRoute";
import { AppLayout } from "./components/layout/AppLayout";

const Login = lazy(() => import("./pages/Login").then(module => ({ default: module.Login })));
const Register = lazy(() => import("./pages/Register").then(module => ({ default: module.Register })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })));
const MinhasLojas = lazy(() => import("./pages/MinhasLojas").then(module => ({ default: module.MinhasLojas })));

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ToastContainer />
          <Suspense fallback={<p role="status" className="p-6">Carregando página...</p>}><Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/minhas-lojas" element={<MinhasLojas />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes></Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
