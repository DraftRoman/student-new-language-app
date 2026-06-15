import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import SentenceGame from "./pages/SentenceGame";
import Placement from "./pages/placement/Placement";
import Speaking from "./pages/speaking/Speaking";
import ProtectedLayout from "./components/organisms/ProtectedLayout";
import AppNavbar from "./components/organisms/AppNavbar";
function RootLayout() {
    const [showAuth, setShowAuth] = useState(false);
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-[var(--bg-base)]", children: [_jsx(AppNavbar, { onSignIn: () => setShowAuth(true) }), _jsx("div", { className: "flex-1 flex flex-col pt-[60px]", children: _jsx(Outlet, { context: { showAuth, setShowAuth } }) }), _jsx("footer", { className: "border-t border-[var(--border-subtle)] bg-[var(--bg-base)] text-sm text-[var(--text-tertiary)]", children: _jsxs("div", { className: "max-w-[1200px] mx-auto px-10 py-7 flex justify-between items-center flex-wrap gap-2", children: [_jsxs("div", { className: "flex items-center gap-[10px] font-bold text-[var(--text-primary)] text-base", children: [_jsx("img", { src: "/turtle.png", alt: "logo", className: "w-7 h-7" }), "TurtleTalk"] }), _jsx("span", { children: "\u00A9 2026 \u00B7 Built with \u2764\uFE0F and a lot of vocabulary" })] }) })] }));
}
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-[var(--bg-base)]", children: _jsx("div", { className: "w-10 h-10 border-[3px] border-[var(--border-medium)] border-t-[var(--c-orange)] rounded-full animate-spin" }) }));
    }
    return user ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/", replace: true });
}
export default function App() {
    return (_jsx(ThemeProvider, { children: _jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(RootLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Landing, {}) }), _jsxs(Route, { element: _jsx(ProtectedRoute, { children: _jsx(ProtectedLayout, {}) }), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/game", element: _jsx(Game, {}) }), _jsx(Route, { path: "/sentence-builder", element: _jsx(SentenceGame, {}) }), _jsx(Route, { path: "/speaking", element: _jsx(Speaking, {}) }), _jsx(Route, { path: "/onboarding/placement", element: _jsx(Placement, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }) }) }));
}
