import { Toaster } from "@hackathon/ui/components/sonner";
import { TooltipProvider } from "@hackathon/ui/components/tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useLayoutEffect } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import type { trpc } from "@/utils/trpc";

import "@/dashboard/dashboard-shell.css";
import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

const RootComponent = () => {
  useLayoutEffect(() => {
    document.body.classList.add("dashboard-shell");
    return () => {
      document.body.classList.remove("dashboard-shell");
    };
  }, []);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        enableSystem={false}
        forcedTheme="light"
        storageKey="vite-ui-theme"
      >
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Yuno | Demo",
      },
      {
        name: "description",
        content: "hackathon wildcard dashboard frame",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
      },
    ],
  }),
});
