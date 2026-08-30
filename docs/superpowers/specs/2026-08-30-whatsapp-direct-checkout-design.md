# WhatsApp: checkout direto após detalhes

## Objetivo

Eliminar a etapa redundante de compra entre o detalhe de produto e o checkout no clone do WhatsApp.

## Fluxo

1. O usuário seleciona **Ver detalhes** em um card do carrossel.
2. O agente retorna um bubble de detalhe estruturado com nome, descrição, preço e o botão **Confirmar pedido**.
3. Ao selecionar **Confirmar pedido**, o cliente envia a ação de criar pedido com o `catalogItemId`.
4. O backend cria o pedido e retorna seu `orderId`.
5. O cliente abre o checkout lateral com esse `orderId`.
6. O usuário seleciona **Confirmar pagamento** no painel; o cliente envia `checkout_returned`.

## Mudanças de contrato

- O bubble de detalhe usa a ação `confirm_order`, não `buy`.
- A ação `confirm_order` cria o pedido e responde com o identificador do pedido.
- A resposta de criação não exibe um bubble de resumo ou um segundo botão **Confirmar compra**.
- O frontend usa o `orderId` retornado para abrir o checkout diretamente.

## Erros e estados

- Enquanto a criação do pedido estiver em processamento, o indicador `.....` permanece visível.
- Caso a criação falhe, o painel não abre e o chat mostra o erro de conexão/processamento existente.
- Se o `orderId` estiver ausente, o cliente não tenta abrir o checkout.

## Verificação

- Reproduzir: carrossel → Ver detalhes → Confirmar pedido → checkout lateral.
- Confirmar que não há botões **Comprar** ou **Confirmar compra** nesse caminho.
- Confirmar que a confirmação de pagamento ainda envia `checkout_returned`.
