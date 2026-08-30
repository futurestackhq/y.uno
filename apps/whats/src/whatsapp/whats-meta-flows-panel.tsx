import { Check, ShieldCheck, ShieldOff, X } from "lucide-react";
import { useEffect, useState } from "react";

import { trpcClient } from "@/utils/trpc";

interface PurchaseMandate {
  allowedMerchantIdsJson: string;
  expiresAt: string;
  isActive: boolean;
  maxAmountCents: number;
}

interface WhatsMetaFlowsPanelProps {
  onClose: () => void;
}

const merchants = [
  { id: "conn_petz", label: "Petz" },
  { id: "conn_raia", label: "Drogasil / Raia" },
  { id: "conn_oxxo", label: "Oxxo Demo" },
  { id: "conn_carrefour", label: "Carrefour" },
] as const;
type MerchantId = (typeof merchants)[number]["id"];

const getInitialExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const isMerchantId = (value: string): value is MerchantId =>
  merchants.some((merchant) => merchant.id === value);

const getMerchantId = (value: string): MerchantId => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && isMerchantId(parsed[0])
      ? parsed[0]
      : "conn_petz";
  } catch {
    return "conn_petz";
  }
};

const toDateInputValue = (value: string) => value.slice(0, 10);

export const WhatsMetaFlowsPanel = ({ onClose }: WhatsMetaFlowsPanelProps) => {
  const [mandate, setMandate] = useState<PurchaseMandate | null>(null);
  const [merchantId, setMerchantId] = useState<MerchantId>("conn_petz");
  const [limit, setLimit] = useState("200");
  const [expiryDate, setExpiryDate] = useState(getInitialExpiryDate);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMandate = async () => {
      try {
        const loadedMandate =
          await trpcClient.commerce.getPurchaseMandate.query();
        setMandate(loadedMandate);
        if (loadedMandate) {
          setMerchantId(getMerchantId(loadedMandate.allowedMerchantIdsJson));
          setLimit(String(loadedMandate.maxAmountCents / 100));
          setExpiryDate(toDateInputValue(loadedMandate.expiresAt));
        }
      } catch {
        setError("Unable to load the purchase mandate.");
      }
      setIsLoading(false);
    };
    loadMandate();
  }, []);

  const saveMandate = async (isActive: boolean) => {
    const limitCents = Math.round(Number(limit) * 100);
    const expiresAt = new Date(`${expiryDate}T23:59:59.999Z`);
    if (
      !Number.isInteger(limitCents) ||
      limitCents < 100 ||
      Number.isNaN(expiresAt.getTime())
    ) {
      setError("Enter a limit of at least R$ 1.00 and a valid expiry date.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedMandate =
        await trpcClient.commerce.setPurchaseMandate.mutate({
          allowedMerchantIds: [merchantId],
          expiresAt: expiresAt.toISOString(),
          isActive,
          maxAmountCents: limitCents,
        });
      setMandate(updatedMandate);
      setError(null);
    } catch {
      setError("Unable to save the purchase mandate.");
    }
    setIsSaving(false);
  };

  const isActive = mandate?.isActive === true;
  const selectedMerchant = merchants.find(
    (merchant) => merchant.id === merchantId
  );

  return (
    <aside className="flex w-76 shrink-0 flex-col border-l border-[#d9dee2] bg-white text-[#111b21]">
      <header className="flex h-14 items-center justify-between border-b border-[#e9edef] px-4">
        <h2 className="text-[15px] font-medium">Purchase mandate</h2>
        <button
          aria-label="Close purchase mandate"
          className="rounded-full p-1.5 text-[#54656f] hover:bg-[#f0f2f5]"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </header>
      <div className="h-0.5 w-5 bg-[#20b15a]" />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pt-5">
        <div className="flex items-center gap-2">
          {isActive ? (
            <ShieldCheck className="text-[#1b8755]" size={22} />
          ) : (
            <ShieldOff className="text-[#d9534f]" size={22} />
          )}
          <div>
            <h3 className="text-[17px] font-semibold">
              {isActive ? "Active mandate" : "Draft mandate"}
            </h3>
            <p className="text-[12px] text-[#667781]">
              Checked before every charge
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-[#e1e6e9] p-3">
          <label className="block text-[12px] font-medium text-[#3b4a54]">
            Allowed merchant
            <select
              className="mt-1.5 h-9 w-full rounded-md border border-[#cfd5d9] bg-white px-2 text-[13px] text-[#111b21]"
              disabled={isLoading || isSaving}
              onChange={(event) => {
                const nextMerchantId = event.target.value;
                setMerchantId(
                  isMerchantId(nextMerchantId) ? nextMerchantId : "conn_petz"
                );
              }}
              value={merchantId}
            >
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] font-medium text-[#3b4a54]">
            Per-order limit (BRL)
            <input
              className="mt-1.5 h-9 w-full rounded-md border border-[#cfd5d9] px-2 text-[13px] text-[#111b21]"
              disabled={isLoading || isSaving}
              min="1"
              onChange={(event) => setLimit(event.target.value)}
              step="1"
              type="number"
              value={limit}
            />
          </label>
          <label className="block text-[12px] font-medium text-[#3b4a54]">
            Valid until
            <input
              className="mt-1.5 h-9 w-full rounded-md border border-[#cfd5d9] px-2 text-[13px] text-[#111b21]"
              disabled={isLoading || isSaving}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setExpiryDate(event.target.value)}
              type="date"
              value={expiryDate}
            />
          </label>
        </div>

        {mandate ? (
          <p className="text-[11px] leading-4 text-[#667781]">
            Current policy: {selectedMerchant?.label ?? "Selected merchant"}, R$
            {limit} per order, valid until {expiryDate}.
          </p>
        ) : (
          <p className="text-[11px] leading-4 text-[#667781]">
            The agent can only charge a saved card after you activate this
            mandate.
          </p>
        )}
        {error ? <p className="text-[12px] text-[#c13f3a]">{error}</p> : null}
      </div>
      <footer className="space-y-2 px-4 pb-4">
        <button
          className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#20b15a] text-[13px] font-medium text-white hover:bg-[#159447] disabled:cursor-not-allowed disabled:bg-[#a7b4b9]"
          disabled={isLoading || isSaving}
          onClick={async () => {
            await saveMandate(true);
          }}
          type="button"
        >
          <Check size={15} />
          {isActive ? "Save changes" : "Activate mandate"}
        </button>
        {isActive ? (
          <button
            className="flex h-9 w-full items-center justify-center rounded-full border border-[#d9534f] text-[13px] font-medium text-[#c13f3a] hover:bg-[#fff2f1] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={async () => {
              await saveMandate(false);
            }}
            type="button"
          >
            Revoke mandate
          </button>
        ) : null}
        <p className="text-center text-[10px] text-[#667781]">
          Every decision is recorded in the session history.
        </p>
      </footer>
    </aside>
  );
};
