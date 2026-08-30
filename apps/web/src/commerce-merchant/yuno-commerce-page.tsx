import { useState } from "react";

import { CommerceOnboarding } from "./commerce-onboarding";
import { CommerceOverview } from "./commerce-overview";
import { CommercialAgreementDialog } from "./commercial-agreement-dialog";
import type { CommerceConnectionStatus } from "./types";

export const YunoCommercePage = () => {
  const [status, setStatus] = useState<CommerceConnectionStatus>("not_started");
  const [agreementOpen, setAgreementOpen] = useState(false);

  if (status === "active") {
    return (
      <CommerceOverview
        onReset={() => {
          setAgreementOpen(false);
          setStatus("not_started");
        }}
      />
    );
  }

  return (
    <>
      <CommerceOnboarding
        onOpenAgreement={() => {
          setStatus("agreement_pending");
          setAgreementOpen(true);
        }}
        status={status}
      />
      <CommercialAgreementDialog
        onAccept={() => setStatus("active")}
        onOpenChange={setAgreementOpen}
        open={agreementOpen}
      />
    </>
  );
};
