import {
  SidebarInset,
  SidebarProvider,
} from "@hackathon/ui/components/sidebar";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { AppHeader } from "@/dashboard/app-header";
import { AppSidebar } from "@/dashboard/app-sidebar";

import "@/dashboard/dashboard-shell.css";

const DashboardLayout = () => (
  <div className="dashboard-shell flex h-svh flex-col">
    <SidebarProvider
      className="min-h-0 flex-1"
      style={{ "--sidebar-width": "255px" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <AppHeader />
        <div className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
);

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});
