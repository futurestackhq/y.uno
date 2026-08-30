import { Button } from "@hackathon/ui/components/button";
import { Card, CardContent } from "@hackathon/ui/components/card";
import { Input } from "@hackathon/ui/components/input";
import { Label } from "@hackathon/ui/components/label";
import { Check, ChevronRight, Link2, ShieldCheck, Store } from "lucide-react";
import { useState } from "react";

import { petzMerchant } from "./fixtures";
import type { CommerceConnectionStatus } from "./types";

interface CommerceOnboardingProps {
  onOpenAgreement: () => void;
  status: Exclude<CommerceConnectionStatus, "active">;
}

const checklistItems = [
  {
    description: "Confirm the details that identify your business.",
    icon: Store,
    title: "Merchant details",
  },
  {
    description: "Publish the products that can appear on WhatsApp.",
    icon: Link2,
    title: "Connected catalog",
  },
  {
    description: "Accept the commission on sales distributed by Yuno.",
    icon: ShieldCheck,
    title: "Commercial agreement",
  },
] as const;

export const CommerceOnboarding = ({
  onOpenAgreement,
  status,
}: CommerceOnboardingProps) => {
  const [isConfigured, setIsConfigured] = useState(status !== "not_started");
  const [name, setName] = useState(petzMerchant.name);
  const [supportEmail, setSupportEmail] = useState(petzMerchant.supportEmail);

  const canContinue = name.trim().length > 0 && supportEmail.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            New sales channel
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">
            Sell on WhatsApp with Yuno infrastructure.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            Set up your Yuno Commerce participation and make your business
            eligible to be discovered by customers in the marketplace.
          </p>
        </section>
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Your activation journey</p>
            {checklistItems.map(({ description, icon: Icon, title }, index) => {
              const completed = isConfigured && index < 2;
              return (
                <div className="flex gap-3" key={title}>
                  <div
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                      completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground border"
                    }`}
                  >
                    {completed ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-muted-foreground text-xs leading-5">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Business setup</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Demo data for your Commerce Connection.
              </p>
            </div>
            {isConfigured ? (
              <span className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
                <Check className="size-4" />
                Ready for review
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="merchant-name">Marketplace display name</Label>
              <Input
                id="merchant-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support email</Label>
              <Input
                id="support-email"
                onChange={(event) => setSupportEmail(event.target.value)}
                type="email"
                value={supportEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routing-connection">Routing connection</Label>
              <Input
                disabled
                id="routing-connection"
                value={petzMerchant.routingConnectionName}
              />
              <p className="text-muted-foreground text-xs">
                Your current routing configuration remains independent.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-source">Catalog</Label>
              <Input
                disabled
                id="catalog-source"
                value="3 published products"
              />
              <p className="text-muted-foreground text-xs">
                Demo catalog ready for the WhatsApp channel.
              </p>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            {isConfigured ? (
              <Button onClick={onOpenAgreement} type="button">
                Review commercial agreement
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                disabled={!canContinue}
                onClick={() => setIsConfigured(true)}
                type="button"
              >
                Save and review
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
