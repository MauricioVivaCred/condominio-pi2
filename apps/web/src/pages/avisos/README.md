# Página: Avisos (`/avisos`)

Central de comunicados do condomínio. Disponível para todos os roles.

---

## Fluxo

1. Busca avisos filtrados pelo `condominioUUID` do usuário logado.
2. ADMIN pode criar, editar e excluir avisos.
3. MORADOR e PORTEIRO visualizam em modo leitura.

---

## Tipos de aviso

Cada aviso tem um `tipo` com cor associada (definida em `AVISO_TIPO_COLORS`). Os tipos são exibidos como badges coloridos tanto na lista quanto nas notificações do sino.

---

## Peculiaridades

- O `condominioUUID` é lido do `localStorage` via `getUser()`. Se não estiver disponível, busca na tabela `usuario_condominio`.
- Avisos aparecem no painel de notificações (sino no header) como não lidos até o usuário marcar como lido.
