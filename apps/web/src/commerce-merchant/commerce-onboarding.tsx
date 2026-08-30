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
    description: "Confirme os dados que identificam sua operação.",
    icon: Store,
    title: "Dados do merchant",
  },
  {
    description: "Publique os produtos que poderão aparecer no Whats.",
    icon: Link2,
    title: "Catálogo conectado",
  },
  {
    description: "Aceite a comissão por vendas distribuídas pela Yuno.",
    icon: ShieldCheck,
    title: "Acordo comercial",
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
            Novo canal de vendas
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight">
            Venda no Whats com a infraestrutura Yuno.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            Configure sua participação no Yuno Commerce e deixe sua operação
            elegível para ser descoberta por clientes no marketplace.
          </p>
        </section>
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium">Sua jornada de ativação</p>
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
              <h2 className="text-lg font-semibold">
                Configuração da operação
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Dados demonstrativos da sua Commerce Connection.
              </p>
            </div>
            {isConfigured ? (
              <span className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
                <Check className="size-4" />
                Pronta para revisão
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="merchant-name">Nome exibido no marketplace</Label>
              <Input
                id="merchant-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">E-mail de suporte</Label>
              <Input
                id="support-email"
                onChange={(event) => setSupportEmail(event.target.value)}
                type="email"
                value={supportEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routing-connection">Connection de routing</Label>
              <Input
                disabled
                id="routing-connection"
                value={petzMerchant.routingConnectionName}
              />
              <p className="text-muted-foreground text-xs">
                Sua configuração de routing atual continua independente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-source">Catálogo</Label>
              <Input
                disabled
                id="catalog-source"
                value="3 produtos publicados"
              />
              <p className="text-muted-foreground text-xs">
                Catálogo demonstrativo pronto para o canal Whats.
              </p>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            {isConfigured ? (
              <Button onClick={onOpenAgreement} type="button">
                Revisar acordo comercial
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                disabled={!canContinue}
                onClick={() => setIsConfigured(true)}
                type="button"
              >
                Salvar e revisar
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
