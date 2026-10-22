import { Outlet } from "react-router";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen gap-4 bg-[#FBFBFB] p-4">
      <Sidebar />
      <div className="flex flex-1 flex-col gap-4">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
