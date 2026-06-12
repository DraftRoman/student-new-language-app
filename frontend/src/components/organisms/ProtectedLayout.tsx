import { Outlet } from "react-router-dom";

export default function ProtectedLayout() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--bg-base)]">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
