# Modelo de Contrato – Yuno Commerce Marketplace (B2C)

Atualizado: 29 ago 2026

---

## 1. Partes

- **Yuno Commerce** (plataforma marketplace e provedor de roteamento de pagamentos)
- **Empresa Parceira** (merchant que oferece produtos/serviços através do canal Yuno Commerce)

## 2. Escopo do Serviço

A Empresa Parceira disponibiliza seu catálogo de itens, preços e condições de entrega para venda no canal WhatsApp “Yuno Commerce”. A Yuno intermedeia a experiência conversacional, processa pagamento e repassa o valor líquido.

## 3. Remuneração da Yuno

1. **Taxa de roteamento** — igual à já praticada quando o merchant usa o Smart Routing da Yuno em seu próprio checkout.
2. **Commission Fee** — porcentagem \(\_x\_%\) sobre cada venda **bem-sucedida** realizada via Yuno Commerce, calculada sobre o valor bruto da transação.

> Fórmula do repasse:  
> `valor_liquido = valor_bruto − taxa_roteamento − (valor_bruto × commission_fee%)`

## 4. Liquidação e Prazo de Repasse

- A liquidação ocorre no mesmo ciclo financeiro já acordado para a Taxa de Roteamento.
- A comissão adicional é retida no momento do repasse.

## 5. Obrigações da Empresa Parceira

- Manter catálogo, estoque e preços atualizados via API ou feed acordado.
- Honrar pedidos confirmados pela Yuno Commerce.
- Tratar suporte pós-venda e logística conforme SLAs.

## 6. Obrigações da Yuno

- Garantir processamento seguro de pagamentos (PCI / LGPD).
- Fornecer dashboard de pedidos e liquidações.
- Disponibilizar histórico de chat para fins de disputa.

## 7. Vigência & Rescisão

- Vigência indeterminada; qualquer parte pode rescindir com 30 dias de aviso.
- Rescisão imediata em caso de violação grave de compliance ou fraude.

## 8. Disputas & Chargebacks

- A Yuno provê trilha de mandato + logs para defesa.
- A taxa de roteamento não é estornada; a commission fee é estornada proporcionalmente se a venda for revertida.

---

_Este documento é referência interna para o modelo financeiro do marketplace; versões legais serão emitidas pelo time jurídico._
