# Menu Win — frontend (contexto do projeto)

@AGENTS.md

## O que é
Frontend do Menu Win (SaaS de cardápio digital e pedidos para restaurantes, mensalidade fixa).
A API e as regras de negócio ficam no repositório `menu-win` (pasta irmã `../menu-win`), cujo CLAUDE.md
é a fonte das decisões de domínio. Aqui só a interface.

## Como trabalhar comigo
- Responder em português do Brasil. Seguir passo a passo.
- Depois de cada mudança: `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- Next.js 16 (App Router, Turbopack, `cacheComponents`). Ler `node_modules/next/dist/docs/` antes de usar API
  do Next que não seja trivial: há mudanças incompatíveis com o Next 15 (ver AGENTS.md).

## Stack
Next.js 16.4, React 19.3, TypeScript, Tailwind 4, Vitest. SSE: `@microsoft/fetch-event-source`.

## Decisões (manter)
- Chamadas direto do navegador para a API (`NEXT_PUBLIC_API_URL`); a API libera a origem em `CORS_ORIGENS`.
  Sem proxy do Next: proxies costumam segurar o SSE da cozinha em buffer.
- Dinheiro em centavos inteiros no front (`lib/dinheiro.ts`); para a API vai como string "19.00".
- Preço nunca é decidido aqui: o carrinho calcula só para mostrar e manda `totalEsperado`;
  a API recalcula e recusa (409) se mudou. `lib/carrinho.ts` espelha as regras da API (testado).
- Carrinho por loja no localStorage via `useSyncExternalStore` (sem erro de hidratação).
- Token do painel no localStorage (8h). Risco de XSS aceito no MVP (React escapa tudo, nenhum HTML de usuário).
  Produção: avaliar BFF com cookie httpOnly.
- SSE da cozinha via fetch com header Authorization. NUNCA token na URL. Ao (re)conectar, recarregar
  `GET /abertos` (a API não faz replay de eventos).
- Painel protegido no cliente só por conveniência; quem garante é a API (token + papel).
- Rotas da loja (`/[slug]`): layout com `<Suspense>` e provider cliente usando `useParams`
  (Next 16 bloqueia dado de URL fora de Suspense no pré-render).
- Páginas do painel: `page.tsx` de servidor com `export const instant = false` + `Tela.tsx` cliente.
  `instant` não pode ficar em arquivo "use client" e precisa estar na página (não basta no layout).
- Pix simulado: quando a API informa `loja.pixSimulado` (só em dev), o checkout rotula "simulado" e a tela do
  pedido mostra botões que chamam `POST /simulador-pix/{id}`. Nunca aparece com a API em produção.
- `/painel` é rota fixa: uma loja não pode ter o slug "painel" (a API ainda não bloqueia; ver pendências).

## Armadilhas já encontradas
- Testando no navegador embutido com a janela escondida: o indicador do `next dev` (canto inferior
  esquerdo) cobre botões no celular, e telas que se atualizam sozinhas mudam o layout entre achar e clicar.

## Pendências
- Service worker (cardápio offline / instalação mais robusta). Hoje só o manifest.
- Slugs reservados na API (`painel`, `api`, `_next`...) quando existir cadastro de loja.
- Erros de validação 400 da API ainda não dizem o campo; o front mostra a mensagem geral.
- Upload de foto (hoje é URL).
