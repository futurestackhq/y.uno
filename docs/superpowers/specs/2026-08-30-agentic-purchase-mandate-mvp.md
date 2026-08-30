# MVP: Mandato de compra agêntica

## Objetivo

Permitir que Marta delegue compras conversacionais dentro de um mandato verificável. Para a demo, o mandato permite compras na Petz de até R$ 200 por pedido, por 30 dias, e pode ser revogado no painel WhatsApp.

## Contrato e fluxo

1. O usuário cria ou ativa um mandato pelo painel lateral.
2. `confirm_order` cria o pedido e verifica mandato, merchant, valor, validade e estado ativo no servidor.
3. Com mandato aprovado e cartão salvo, o pedido é marcado como pago sem abrir checkout.
4. Sem cartão, o checkout continua sendo aberto; com mandato negado, nenhuma cobrança é tentada.
5. O pedido referencia o mandato usado e o log de execução registra a decisão.

## Comandos

- Testes: `bun test packages/api/src/commerce/mandate.test.ts packages/api/src/commerce/dispatcher.test.ts`
- Tipos: `bun run check-types`
- Qualidade: `bun run check`
- Demo local: `bun run dev`

## Estrutura

- `packages/db/src/schema.ts` e `migrations/`: persistência do mandato e vínculo com pedido.
- `packages/api/src/commerce/mandate.ts`: decisão de política, sem dependência de UI.
- `packages/api/src/commerce/dispatcher.ts`: verificação antes da cobrança e auditoria.
- `packages/api/src/routers/commerce.ts`: leitura e atualização do mandato da demo.
- `apps/whats/src/whatsapp/whats-meta-flows-panel.tsx`: criação, exibição e revogação.

## Estilo e testes

Funções de política recebem dados explícitos e retornam uma decisão discriminada, por exemplo `evaluatePurchaseMandate({ mandate, merchantId, totalCents })`. Os testes cobrem aprovado, revogado, expirado, merchant não permitido e limite excedido.

## Limites

- Sempre: verificar no servidor antes de mudar pedido para pago e auditar toda decisão.
- Perguntar antes: mudar o provedor de pagamento ou adicionar dependências.
- Nunca: cobrar por cartão salvo sem mandato aprovado.

## Critérios de sucesso

- Petz a R$ 189,90 é paga automaticamente apenas com mandato ativo e cartão salvo.
- Raia, valor acima de R$ 200, mandato expirado ou revogado não criam cobrança.
- A decisão e o mandato ficam consultáveis no log e no pedido.
