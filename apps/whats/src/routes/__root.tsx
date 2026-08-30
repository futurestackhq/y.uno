import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";

import "../index.css";

export const Route = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
  head: () => ({
    meta: [
      {
        title: "Whats — Yuno Commerce",
      },
      {
        name: "description",
        content: "Yuno Commerce WhatsApp visual simulator",
      },
    ],
  }),
});
