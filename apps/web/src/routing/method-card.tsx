import type { PaymentMethod } from "./payment-methods";
import { PhosphorInfo } from "./phosphor";

interface MethodCardProps {
  method: PaymentMethod;
  onSetUp: (id: string) => void;
}

export const MethodCard = ({ method, onSetUp }: MethodCardProps) => (
  <div className="yuno-method-card">
    <button className="absolute top-4 right-4 text-[#6c6f75]" type="button">
      <PhosphorInfo size={16} />
      <span className="sr-only">About {method.name}</span>
    </button>
    <div className="flex w-full items-center gap-4 text-left">
      <img
        alt=""
        className="size-14 shrink-0 object-contain"
        height={56}
        src={method.logo}
        width={56}
      />
      <span className="text-[18px] leading-6">{method.name}</span>
    </div>
    <div className="flex w-full items-end justify-between">
      <span className="yuno-chip">Not published</span>
      <button
        className="yuno-btn-setup"
        onClick={() => {
          onSetUp(method.id);
        }}
        type="button"
      >
        Set up
      </button>
    </div>
  </div>
);
