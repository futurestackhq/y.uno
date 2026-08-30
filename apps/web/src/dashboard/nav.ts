import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Box,
  Code,
  FileSearch,
  GitBranch,
  LineChart,
  Link,
  Monitor,
  Repeat,
  ShieldAlert,
  ShoppingCart,
  Terminal,
} from "lucide-react";

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  to?: "/routing" | "/commerce";
}

export const dashboardNav: DashboardNavItem[] = [
  { icon: Monitor, label: "Home", to: "/commerce" },
  { icon: Box, label: "Connections" },
  { icon: ShoppingCart, label: "Yuno Commerce", to: "/commerce" },
  { icon: GitBranch, label: "Routing", to: "/routing" },
  { icon: ArrowLeftRight, label: "Payments" },
  { icon: Repeat, label: "Reconciliations" },
  { icon: LineChart, label: "Insights" },
  { icon: Code, label: "Developers" },
  { icon: ShieldAlert, label: "Risk conditions" },
  { icon: Link, label: "Payment links" },
  { icon: FileSearch, label: "Audit logs" },
  { icon: Terminal, label: "API reference" },
];
