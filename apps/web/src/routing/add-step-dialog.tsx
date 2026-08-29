import {
  PhosphorCheckCircle,
  PhosphorClock,
  PhosphorProhibit,
  PhosphorWarningCircle,
} from "./phosphor";

const OUTCOMES = [
  {
    icon: PhosphorCheckCircle,
    id: "succeeded",
    label: "Succedded",
    tone: "#12823B",
  },
  {
    icon: PhosphorClock,
    id: "pending",
    label: "Pending",
    tone: "#086BFF",
  },
  {
    icon: PhosphorProhibit,
    id: "declined",
    label: "Declined",
    tone: "#E07A3E",
  },
  {
    icon: PhosphorWarningCircle,
    id: "error",
    label: "Error / Paused",
    tone: "#D13B3B",
  },
] as const;

export type StepOutcome = (typeof OUTCOMES)[number]["label"];

interface AddStepDialogProps {
  onSelectOutcome: (outcome: StepOutcome) => void;
}

export const AddStepDialog = ({ onSelectOutcome }: AddStepDialogProps) => (
  <div className="yuno-node-shadow relative w-[200px] rounded-lg bg-white">
    <div className="flex flex-col items-center px-4 py-4">
      <img
        alt=""
        className="size-10 object-contain"
        height={40}
        src="/providers/cybersource.png"
        width={40}
      />
      <p className="mt-2 text-base">Cybersource</p>
      <p className="text-muted-foreground text-xs">Test</p>
    </div>
    {OUTCOMES.map((outcome) => {
      const Icon = outcome.icon;
      return (
        <button
          className="yuno-provider-row"
          key={outcome.id}
          onClick={() => {
            onSelectOutcome(outcome.label);
          }}
          type="button"
        >
          <span className="flex items-center">
            <Icon fill={outcome.tone} />
            <span className="ml-2 text-xs">{outcome.label}</span>
          </span>
        </button>
      );
    })}
  </div>
);
