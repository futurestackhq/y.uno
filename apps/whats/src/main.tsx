import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  defaultPreload: "intent",
  routeTree,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.querySelector("#app");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />);
