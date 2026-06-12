import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
export default function ProtectedLayout() {
    return (_jsx("div", { className: "min-h-screen flex flex-col font-sans bg-[var(--bg-base)]", children: _jsx("main", { className: "flex-1 flex flex-col", children: _jsx(Outlet, {}) }) }));
}
