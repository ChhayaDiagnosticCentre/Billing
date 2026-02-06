import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RecentEntries from "./pages/RecentEntries";
import NewVisit from "./pages/NewVisit";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import Reports from "./pages/Reports";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected routes with layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recent"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RecentEntries />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/visits/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NewVisit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/visits/edit/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <NewVisit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Patients />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctors"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Doctors />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <Billing />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
