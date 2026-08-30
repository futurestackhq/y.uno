import { Sheet, SheetContent } from "@hackathon/ui/components/sheet";
import { useEffect, useMemo, useRef } from "react";

import type { CheckoutReturnedMessage } from "./types";

const CHECKOUT_ORIGIN =
  typeof window === "undefined" ? "" : window.location.origin;

const isCheckoutReturnedMessage = (
  data: unknown
): data is CheckoutReturnedMessage => {
  if (data && typeof data === "object") {
    const { payload, type } = data as { payload?: unknown; type?: unknown };

    if (type !== "checkout_returned") {
      return false;
    }

    if (!payload || typeof payload !== "object") {
      return false;
    }

    const { order_id, status } = payload as Partial<
      CheckoutReturnedMessage["payload"]
    >;
    return (
      typeof order_id === "string" && (status === "paid" || status === "failed")
    );
  }

  return false;
};

export const DeviceBrowserSheet = (props: {
  open: boolean;
  url: string;
  onClose: () => void;
  onCheckoutReturned: (msg: CheckoutReturnedMessage["payload"]) => void;
}) => {
  const { onCheckoutReturned, onClose, open, url } = props;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const checkoutUrlOrigin = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    try {
      return new URL(url, window.location.origin).origin;
    } catch {
      return "";
    }
  }, [url]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (event: MessageEvent<unknown>) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }
      if (checkoutUrlOrigin !== CHECKOUT_ORIGIN) {
        return;
      }
      if (event.origin !== CHECKOUT_ORIGIN && event.origin !== "null") {
        return;
      }
      if (!isCheckoutReturnedMessage(event.data)) {
        return;
      }
      onCheckoutReturned(event.data.payload);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [checkoutUrlOrigin, onCheckoutReturned, open]);

  return (
    <Sheet onOpenChange={(next) => (next ? null : onClose())} open={open}>
      <SheetContent side="bottom" className="flex h-[85svh] flex-col p-0">
        <div className="border-b px-4 py-3 text-sm font-medium">Browser</div>
        <iframe
          className="h-full w-full"
          ref={iframeRef}
          sandbox="allow-forms allow-scripts"
          src={url}
          title="checkout"
        />
      </SheetContent>
    </Sheet>
  );
};
