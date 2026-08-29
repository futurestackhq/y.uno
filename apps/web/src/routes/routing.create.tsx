import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FlowCanvas } from "@/routing/flow-canvas";
import {
  PhosphorArrowLeft,
  PhosphorInfo,
  PhosphorPencil,
  PhosphorPlay,
  PhosphorStar,
} from "@/routing/phosphor";
import { RouteNameDialog } from "@/routing/route-name-dialog";

import "@/dashboard/dashboard-shell.css";

const CreateRoutePage = () => {
  const [nameOpen, setNameOpen] = useState(true);

  return (
    <div className="dashboard-shell flex h-svh flex-col bg-[var(--canvas)]">
      <div className="flex items-center justify-between bg-white p-6">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-2 text-sm" to="/routing">
            <PhosphorArrowLeft />
            Back to Card conditions
          </Link>
          <span className="h-[30px] w-px bg-[#eceff2]" />
          <span className="flex items-center gap-2 text-sm">
            Version: 1
            <PhosphorPencil />
          </span>
        </div>
        <div className="flex items-center gap-4">
          <PhosphorStar />
          <span className="h-[30px] w-px bg-[#eceff2]" />
          <PhosphorInfo />
          <span className="h-[30px] w-px bg-[#eceff2]" />
          <PhosphorPlay />
          <button className="yuno-btn-outlined" type="button">
            Close and continue later
          </button>
          <button className="yuno-btn-contained" type="button">
            Push to production
          </button>
        </div>
      </div>
      <FlowCanvas />
      <RouteNameDialog onOpenChange={setNameOpen} open={nameOpen} />
    </div>
  );
};

export const Route = createFileRoute("/routing/create")({
  component: CreateRoutePage,
  validateSearch: (search: Record<string, unknown>) => ({
    method: typeof search.method === "string" ? search.method : "card",
  }),
});
