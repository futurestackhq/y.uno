export interface PurchaseMandate {
  allowedMerchantIdsJson: string;
  expiresAt: string;
  id: string;
  isActive: boolean;
  maxAmountCents: number;
}

export type MandateDecision =
  | { approved: true; mandateId: string }
  | {
      approved: false;
      reason: "expired" | "inactive" | "merchant_not_allowed" | "over_limit";
    };

const parseAllowedMerchantIds = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
};

export const evaluatePurchaseMandate = ({
  mandate,
  merchantId,
  now = new Date(),
  totalCents,
}: {
  mandate: PurchaseMandate;
  merchantId: string;
  now?: Date;
  totalCents: number;
}): MandateDecision => {
  if (!mandate.isActive) {
    return { approved: false, reason: "inactive" };
  }
  if (new Date(mandate.expiresAt) <= now) {
    return { approved: false, reason: "expired" };
  }
  if (
    !parseAllowedMerchantIds(mandate.allowedMerchantIdsJson).includes(
      merchantId
    )
  ) {
    return { approved: false, reason: "merchant_not_allowed" };
  }
  if (totalCents > mandate.maxAmountCents) {
    return { approved: false, reason: "over_limit" };
  }
  return { approved: true, mandateId: mandate.id };
};
