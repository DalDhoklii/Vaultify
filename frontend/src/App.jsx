import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import useStore from "./store";
import Home from "./pages/home";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import ProtectedRoute from "./components/protected-routes";
import { ThemeProvider } from "./components/theme-provider";
import { LoadingState } from "./components/loading-state";

// App pages are loaded on demand so the landing page stays light
const DashboardPage = lazy(() => import("./pages/dashboard"));
const TransactionsPage = lazy(() => import("./pages/transactions"));
const ReportsPage = lazy(() => import("./pages/reports"));
const CategoriesPage = lazy(() => import("./pages/categories/categories"));
const SettingsPage = lazy(() => import("./pages/settings"));

const protectedRoutes = [
  { path: "/dashboard", Page: DashboardPage },
  { path: "/transactions", Page: TransactionsPage },
  { path: "/reports", Page: ReportsPage },
  { path: "/categories", Page: CategoriesPage },
  { path: "/settings", Page: SettingsPage },
];

function App() {
  const rehydrateAuth = useStore((state) => state.rehydrateAuth);

  useEffect(() => {
    rehydrateAuth();
  }, [rehydrateAuth]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<LoadingState message="Loading..." />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes */}
            {protectedRoutes.map(({ path, Page }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Page />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* Unknown URLs go home instead of rendering a blank page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
