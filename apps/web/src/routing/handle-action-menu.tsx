import { PhosphorArrowCircleRight } from "./phosphor";

const CONTINUE_ACTIONS = ["Add step", "Group by decline types"] as const;
const FINALIZE_ACTIONS = ["Decline"] as const;

export type HandleAction =
  | "Continue"
  | (typeof CONTINUE_ACTIONS)[number]
  | (typeof FINALIZE_ACTIONS)[number]
  | "Finalize";

interface HandleActionMenuProps {
  onAction: (action: HandleAction) => void;
}

export const HandleActionMenu = ({ onAction }: HandleActionMenuProps) => (
  <div className="yuno-handle-menu">
    <div className="p-4">
      <p className="mb-4 text-[11px] leading-[16.5px]">Continue</p>
      {CONTINUE_ACTIONS.map((action) => (
        <button
          className="mb-4 flex w-full items-center justify-between text-left last:mb-0"
          key={action}
          onClick={() => {
            onAction(action);
          }}
          type="button"
        >
          <span className="mr-10 text-sm">{action}</span>
          <PhosphorArrowCircleRight />
        </button>
      ))}
    </div>
    <div className="border-t border-dashed border-[#92959b]" />
    <div className="p-4">
      <p className="mb-4 text-[11px] leading-[16.5px]">Finalize</p>
      {FINALIZE_ACTIONS.map((action) => (
        <button
          className="flex w-full items-center justify-between text-left"
          key={action}
          onClick={() => {
            onAction(action);
          }}
          type="button"
        >
          <span className="mr-10 text-sm">{action}</span>
          <PhosphorArrowCircleRight />
        </button>
      ))}
    </div>
  </div>
);
