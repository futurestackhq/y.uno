import { createFileRoute } from "@tanstack/react-router";

import { YunoCommercePage } from "@/commerce-merchant/yuno-commerce-page";

export const Route = createFileRoute("/_dashboard/yuno-commerce/")({
  component: YunoCommercePage,
});
