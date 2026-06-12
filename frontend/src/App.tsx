import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Landing         from "./pages/Landing";
import Dashboard       from "./pages/Dashboard";
import Game            from "./pages/Game";
import SentenceGame    from "./pages/SentenceGame";
import Placement       from "./pages/placement/Placement";
import ProtectedLayout from "./components/organisms/ProtectedLayout";
import AppNavbar       from "./components/organisms/AppNavbar";

function RootLayout() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <AppNavbar onSignIn={() => setShowAuth(true)} />
      <div className="flex-1 flex flex-col pt-[60px]">
        <Outlet context={{ showAuth, setShowAuth }} />
      </div>
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] text-sm text-[var(--text-tertiary)]">
        <div className="max-w-[1200px] mx-auto px-10 py-7 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-[10px] font-bold text-[var(--text-primary)] text-base">
            <img src="/turtle.png" alt="logo" className="w-7 h-7" />
            TurtleTalk
          </div>
          <span>© 2026 · Built with ❤️ and a lot of vocabulary</span>
        </div>
      </footer>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-10 h-10 border-[3px] border-[var(--border-medium)] border-t-[var(--c-orange)] rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Landing />} />

            <Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
              <Route path="/dashboard"            element={<Dashboard />} />
              <Route path="/game"                 element={<Game />} />
              <Route path="/sentence-builder"     element={<SentenceGame />} />
              <Route path="/onboarding/placement" element={<Placement />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
