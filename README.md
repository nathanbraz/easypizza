# EasyPizza — Frontend

Frontend (React 19 + Vite + TypeScript) do EasyPizza: uma plataforma SaaS multi-tenant de pedidos via WhatsApp. O nome é "pizza", mas serve qualquer tipo de comércio. O cliente final manda mensagem no WhatsApp da loja, recebe um link mágico, e faz o pedido online sem cadastro tradicional — sem senha, sem formulário de nome/telefone. O único formulário manual é o de endereço.

Repositório irmão: [`easypizzab`](../easypizzab) (backend .NET) — as duas stacks Docker são independentes, mas rodam lado a lado no mesmo host em desenvolvimento.

## Stack

- **React 19** + **Vite** + **TypeScript**
- **react-router-dom** v7
- **axios**, com interceptors pra tenant/sessão (ver `src/lib/api.ts`)
- CSS puro (sem Tailwind/utility libraries), estilo dark + glassmorphism
- **oxlint** para lint

## Arquitetura

SPA única que serve três públicos diferentes, decidido dinamicamente por hostname/rota (`src/App.tsx`):

- **`admin.*`** → painel Master (dono da plataforma SaaS): gestão de tenants, roles e usuários master.
- **Subdomínio de uma loja** (`{slug}.*`) → cardápio público do cliente final (`/`) + área administrativa da loja (`/admin/*`, protegida).
- Em desenvolvimento local sem subdomínio (`localhost:3333/{slug}`), o slug do tenant é lido do path como fallback.

```
src/
  components/        Cart, CheckoutModal, AddressForm, ProductCard, ProductModal, ProtectedRoute
  contexts/           AuthContext.tsx (JWT de staff + permissões decodificadas)
  hooks/              useLockBodyScroll, usePermission
  lib/api.ts          instância axios + interceptors (tenant slug, JWT de staff, sessão do cliente)
  pages/
    Admin/            Catalog, Couriers, Orders, Settings — área do lojista
    Auth/Login.tsx     login único (Master ou Tenant, decidido pelo host)
    Master/            Dashboard, Roles, Tenants, Users — área do dono da plataforma
    MenuPage/          cardápio público do cliente final
    AddressesPage/      "Meus Endereços" do cliente final
    OrderTrackerPage/  "Meus Pedidos" / acompanhamento de pedido do cliente final
    Tenant/            Roles, Users — gestão de equipe do lojista
```

**Duas sessões completamente separadas**, cada uma com sua própria chave de `localStorage` e header HTTP (ver `src/lib/api.ts`): JWT de staff (`@EasyPizza:StaffToken`, header `Authorization: Bearer`) e sessão do cliente final via magic link (`@EasyPizza:CustomerSessionToken`, header `X-Customer-Session`). Não compartilham namespace de propósito.

## Rodando localmente

Tudo roda via Docker — o host de desenvolvimento não tem Node.js/npm instalado.

```bash
docker compose up --build -d
```

Serve em `http://localhost:3333` com hot-reload. Aponta pra API do backend via `VITE_API_URL` (default: `http://localhost:5000/api`, configurável no `docker-compose.yml` deste repo).

Para comandos pontuais (lint, instalar pacote novo, etc.):

```bash
docker compose run --rm frontend npm run <script>
```

## Documentação

- [`docs/implementation_plan.md`](./docs/implementation_plan.md) — decisões de arquitetura, fluxo completo do cliente, catálogo de bugs/dívidas técnicas corrigidos e o roadmap. Espelhado no repo do backend.
- [`docs/SKILLS.md`](./docs/SKILLS.md) — convenções e boas práticas específicas de React usadas neste projeto.
