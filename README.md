# Menu Win — frontend

Cardápio digital (PWA), painel do lojista e tela da cozinha em tempo real.
Consome a API [menu-win](https://github.com/Fernando-1990/menu-win) (Spring Boot).

## Rodar localmente
Pré-requisitos: Node 20.9+ e a API rodando (veja o README da API).

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                  # http://localhost:3000
```

- Cardápio público: http://localhost:3000/padaria-demo (loja de exemplo da API em dev)
- Painel: http://localhost:3000/painel (login de dev no comentário de `db/dev/R__seed_dev.sql` da API)

## Telas
| Rota | Quem usa | O que faz |
|---|---|---|
| `/{slug}` | Cliente | Cardápio da loja, com a cor dela, adicionais e carrinho |
| `/{slug}/checkout` | Cliente | Comer aqui / retirar / entrega, dados, pagamento |
| `/{slug}/pedido/{id}` | Cliente | Acompanhamento (e Pix: QR e copia-e-cola) |
| `/painel/cozinha` | Todos do painel | Pedidos em tempo real (SSE), andamento, “recebi o pagamento” |
| `/painel/cardapio` | Dono e gerente | Categorias, produtos e grupos de adicionais |
| `/painel/configuracoes` | Dono | Como a loja atende e conta do Mercado Pago |

## Verificações
```bash
npm test            # regras do carrinho (Vitest)
npm run lint
npm run typecheck
npm run build
```
