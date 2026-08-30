import { Check, ChevronRight, X } from "lucide-react";

interface WhatsMetaFlowsPanelProps {
  onClose: () => void;
}

export const WhatsMetaFlowsPanel = ({ onClose }: WhatsMetaFlowsPanelProps) => (
  <aside className="flex w-76 shrink-0 flex-col border-l border-[#d9dee2] bg-white text-[#111b21]">
    <header className="flex h-14 items-center justify-between border-b border-[#e9edef] px-4">
      <h2 className="text-[15px] font-medium">Revisar categorias</h2>
      <button
        aria-label="Fechar Meta Flows"
        className="rounded-full p-1.5 text-[#54656f] hover:bg-[#f0f2f5]"
        onClick={onClose}
        type="button"
      >
        <X size={18} />
      </button>
    </header>
    <div className="h-0.5 w-5 bg-[#20b15a]" />
    <div className="flex-1 px-4 pt-5">
      <h3 className="text-[17px] font-semibold">Adedayo Diana Costa Sanni</h3>
      <p className="mt-3 text-[13px] text-[#3b4a54]">💰 R$ 1,00</p>
      <p className="mt-3 text-[13px] text-[#3b4a54]">📅 29/08 às 13h24</p>
      <p className="mt-3 text-[13px] text-[#3b4a54]">💸 Pix</p>

      <button
        className="mt-5 flex h-10 w-full items-center justify-between rounded-md border border-[#cfd5d9] px-3 text-left text-[13px] text-[#54656f] hover:bg-[#f5f6f6]"
        type="button"
      >
        <span>Categoria Opcional</span>
        <ChevronRight size={16} />
      </button>
      <label className="mt-4 flex gap-2 text-[11px] leading-4 text-[#667781]">
        <input className="mt-0.5 accent-[#20b15a]" type="checkbox" />
        <span>
          (Opcional) Manter categoria para próximas transações para Adedayo
          Diana Costa Sanni
        </span>
      </label>
    </div>
    <footer className="space-y-2 px-4 pb-4">
      <p className="text-center text-[11px] text-[#667781]">1/1</p>
      <button
        className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#20b15a] text-[13px] font-medium text-white hover:bg-[#159447]"
        type="button"
      >
        Próximo
        <Check size={15} />
      </button>
      <p className="text-center text-[10px] text-[#667781]">
        <span className="text-[#20b15a]">●</span> Managed by Magie.{" "}
        <span className="font-medium text-[#1b8755]">Learn more</span>
      </p>
    </footer>
  </aside>
);
