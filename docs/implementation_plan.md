# SaaS de Pedidos via WhatsApp (Multi-tenant) — Plano de Implementação v2

> Este documento substitui a proposta inicial (v1). O fluxo principal já está implementado nos dois repositórios (`easypizza` = frontend, `easypizzab` = backend) e várias decisões que estavam em aberto na v1 já foram tomadas na prática. Este documento reflete o estado real + decisões confirmadas, cataloga os problemas encontrados numa revisão de arquitetura, e define o roadmap da próxima fase (correção de bugs e melhorias). Espelhado em `easypizzab/docs/implementation_plan.md`.

## O que mudou em relação à v1

| Tema | v1 (proposta inicial) | v2 (decisão confirmada) |
|---|---|---|
| Multi-tenancy | Banco único + coluna `TenantId` + EF Core Query Filters | **Banco Postgres isolado por tenant** (`Tenant.ConnectionString`), migrado automaticamente no boot |
| Integração WhatsApp | Em aberto (Meta oficial vs Twilio vs Baileys/Evolution API) | **Evolution API**, com compatibilidade automática para payload no formato UltraMsg |
| Infra Docker | Não discutido | **Frontend e backend desacoplados**: cada repositório terá seu próprio `docker-compose.yml`, sem referência cruzada de build context |
| Pagamento | Em aberto (na entrega vs online) | Mantido na entrega por ora (Pix copia-e-cola/dinheiro/cartão na hora); gateway de pagamento online fica como item futuro |
| Taxa de entrega | Em aberto (bairro vs distância/GPS) | Fixa por loja (`StoreSettings.DeliveryFee`) por enquanto; cálculo dinâmico fica como item futuro |
| Sessão do cliente final | "Token único criptografado" (vago) | Confirmado: **não é JWT**. É o `Guid` de um registro `OrderSession` no banco do tenant, validado a cada request contra a tabela |

---

## 1. Fluxo do cliente (confirmado, já implementado)

1. **Gatilho**: cliente manda mensagem no WhatsApp da loja.
2. **Bot**: `WhatsappBotService` responde com menu ("Digite 1 para Cardápio, 2 para Atendente").
3. **Geração do link**: ao digitar "1", `SessionService.GenerateMagicLinkSessionAsync` faz *get-or-create* do `Customer` pelo telefone (cadastro implícito, sem formulário) e cria uma `OrderSession` (validade 2h). O `Guid` dessa sessão **é o token**.
4. **Acesso**: cliente clica no link (`http://{slug}.dominio/?t={sessionId}`).
5. **Autenticação invisível**: o frontend lê `?t=`, chama `GET /sessions/{token}/customer-info`, recebe nome/telefone/endereço padrão/último pedido já preenchidos.
6. **Único formulário manual**: endereço de entrega (com autocomplete de CEP via ViaCEP).
7. **Pedido**: cliente finaliza, recebe notificações automáticas de status via WhatsApp a cada mudança (`New` → `Preparing` → `Delivering` → `Completed`/`Canceled`).

Esse fluxo está genuinamente implementado ponta a ponta (não é só front sem backend por trás). Os problemas identificados (seção 3) são de segurança/robustez sobre esse fluxo, não de ausência dele.

---

## 2. Decisões arquiteturais confirmadas

### 2.1 Multi-tenancy: banco isolado por tenant

Cada loja tem seu próprio banco Postgres (`easypizza_{slug}`), com a connection string guardada em `Tenant.ConnectionString` no banco master (`easypizza_master`). Um `DatabaseMigrator` aplica as migrations de todos os bancos automaticamente no boot da API. O tenant da requisição é resolvido por `HttpTenantProvider` (header `X-Tenant-Slug` → subdomínio do host → parâmetro de rota → query string).

**Motivo da escolha**: isolamento real de dados entre comerciantes (uma falha de query filter no banco único poderia vazar pedidos entre lojas — risco inaceitável para um SaaS multi-tenant de dados sensíveis de clientes). O custo é mais complexidade operacional (N bancos para migrar/monitorar), aceito conscientemente.

**Implicação para a próxima fase**: qualquer criação de nova loja (`TenantsController.Create`) precisa continuar provisionando banco + rodando migrations + criando admin padrão de forma atômica — vale revisar se isso já tem tratamento de falha parcial (loja criada mas banco falhou, etc.) quando entrarmos na fase de correções.

### ✅ RESOLVIDO — 2.2 Desacoplamento de infraestrutura Docker entre frontend e backend

**Estado anterior**: `easypizzab/docker-compose.yml` buildava o frontend a partir de `context: ../easypizza`, com bind mounts apontando para pastas do repositório irmão. Isso acoplava os dois repositórios: não era possível subir/deployar um sem o outro estar clonado ao lado.

**O que foi feito**:
- `easypizzab/docker-compose.yml` agora orquestra só `db`, `pgadmin` e `api` (serviço `frontend` removido).
- `easypizza` ganhou seu próprio `docker-compose.yml`, com só o serviço `frontend` (usa o `Dockerfile` que já existia no próprio repo), publicando `VITE_API_URL=http://localhost:5000/api` como variável de ambiente.
- Comunicação entre os dois continua via `http://localhost:5000/api` (porta publicada no host) — sem precisar de rede Docker compartilhada, já validado com os dois `docker compose up` rodando lado a lado.
- `src/lib/api.ts` trocou o `baseURL` hardcoded por `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.
- `DOCKER_INSTRUCTIONS.md` atualizado para refletir os dois comandos independentes (um em cada pasta), incluindo o passo de copiar `.env.example` → `.env` no backend.

Validado: as duas stacks sobem cada uma isolada no seu próprio projeto Docker Compose (`easypizza_default` / `easypizzab_default`), `docker compose ps` em cada pasta mostra só os serviços daquele repo, e o frontend consegue falar com a API normalmente.

**Motivo**: repositórios independentes deveriam poder ser buildados, testados e deployados de forma independente — é o padrão esperado para dois serviços que vão, inclusive, ter pipelines de deploy (Kamal) separados no futuro.

### 2.3 Sessão do cliente final não é JWT (decisão correta, mantida deliberadamente)

O magic link não usa o mesmo mecanismo de autenticação do staff (ASP.NET Identity + JWT). É um `Guid` opaco (`OrderSession.Id`) validado contra a tabela `OrderSessions` do banco do tenant a cada request, com expiração de 2h (`OrderSession.IsValid()`).

**Por que não deve virar JWT**: JWT vale a pena quando (a) você quer validação sem round-trip ao banco e (b) precisa carregar claims que o servidor não precisaria reconferir. Nenhum dos dois se aplica aqui — toda requisição que usa esse token já vai ao banco buscar dados reais do cliente (nome, endereço, histórico), então não há ganho de performance em ser stateless; e o token não carrega papéis/permissões, só identifica um `Customer`. Além disso, a regra de negócio exige revogação por evento (expirar ao concluir o pedido — BUG-02), o que um JWT clássico não faz sem reintroduzir estado no servidor, anulando a vantagem de ser stateless. Token opaco validado contra tabela é o padrão correto para autenticação tipo "magic link" — a decisão está certa, não é dívida técnica.

**O que de fato precisa de correção não é o formato do token, é a falta de enforcement dele** — hoje ele só é usado para leitura (pré-preencher o form), não é exigido nas escritas sensíveis (`UpdateAddress`, `CreateOrder`), e compartilha namespace com o JWT de staff no `localStorage`. Ver BUG-01, BUG-03 e BUG-04 na seção 3 — resolvidos pelo mesmo fix unificado (`RequireCustomerSession`).

**Refinamento opcional, não recomendado nesta fase**: separar o "link mágico" (uso único, trocado uma vez) de uma "credencial de sessão" renovável emitida após a troca, para que um link antigo vazado não sequestre uma sessão já em andamento. É hardening real, mas overkill para o risco atual (sem dados de pagamento armazenados na sessão); melhor fechar primeiro os gaps de enforcement (P0/P1) antes de adicionar essa camada.

---

## 3. Catálogo de problemas encontrados (para corrigir na próxima fase)

Prioridade: **P0** = quebra o fluxo hoje ou é falha de segurança direta · **P1** = risco de segurança relevante · **P2** = infraestrutura/dívida técnica · **P3** = produto/qualidade.

### P0 — BUG-01: `CustomersController` bloqueado por autenticação de staff

`[Authorize(Policy = "RequireTenant")]` foi colocado no nível da classe inteira (commit `18604f1`, "zero trust isolation and PBAC foundation"), cobrindo `RegisterFromWhatsApp` e `UpdateAddress` — os dois únicos comentários no próprio código dizem "chamado pelo Webhook/Bot" e "chamado pelo Frontend no checkout", ou seja, endpoints que o **cliente final** precisa chamar sem ter um JWT de staff. Isso provavelmente está quebrando agora mesmo o salvamento de endereço no checkout (o browser do cliente recebe 401).

**Correção proposta**: ver "Fix unificado P0" abaixo — não é só remover o `[Authorize]`, é trocar por um mecanismo de autorização correto para cliente final.

### P0 — BUG-03: criação de pedido não valida a sessão do cliente

`POST /api/Orders/{tenantSlug}` é público e recebe `CustomerId` diretamente no corpo da requisição, sem checar se quem está chamando tem uma `OrderSession` válida para aquele cliente. Qualquer requisição que souber (ou adivinhar/vazar) o `Guid` de um `CustomerId` pode criar pedidos em nome de outro cliente.

**Correção proposta**: junto com BUG-01, no mesmo mecanismo unificado abaixo.

### Fix unificado para BUG-01 e BUG-03: mecanismo de sessão de cliente dedicado

Hoje só existe autorização "staff" (`RequireTenant`/`RequireMaster`, via JWT). Proposta: criar uma política de autorização **separada** para cliente final, `RequireCustomerSession`:

- O frontend passa a enviar o token de sessão (o mesmo `Guid` do magic link) num header dedicado, ex. `X-Customer-Session`, em vez de reaproveitar o `Authorization: Bearer` usado pelo JWT de staff.
- Um `IAuthorizationHandler`/middleware valida esse header contra `OrderSessions` (existe, `IsValid()`, pertence ao tenant correto) e, se válido, disponibiliza o `CustomerId` **derivado do servidor** (não confiado do corpo da requisição) para o controller/service.
- `CustomersController.UpdateAddress` e `OrdersController.CreateOrder` passam a exigir `RequireCustomerSession` (removendo a policy de classe incorreta do `CustomersController`) e a usar o `CustomerId` resolvido pela sessão em vez do que vier no payload do cliente.
- `RegisterFromWhatsApp`/geração do magic link continuam sem exigir sessão prévia (é o único ponto de entrada, chamado internamente pelo bot).

Isso resolve os dois bugs com uma única peça de infraestrutura de autorização, em vez de dois remendos pontuais.

**Regressão introduzida e corrigida durante a implementação**: a primeira versão do `CustomerSessionAuthorizationHandler` injetava `IRepository<OrderSession>` (dependente do `EasyPizzaDbContext`, banco *do tenant*) direto no construtor. O ASP.NET Core instancia **todos** os `IAuthorizationHandler` registrados em **toda** verificação de autorização, inclusive nas rotas de Master (`admin.lvh.me`, que por design nunca tem tenant resolvido) — então a simples existência do handler já derrubava qualquer requisição de Master com "No database provider has been configured for this DbContext" (500). Corrigido adiando a resolução do repositório: injeta `IServiceProvider` em vez do repositório direto, e só resolve `IRepository<OrderSession>` dentro de `HandleRequirementAsync`, depois de confirmar que (a) existe o header `X-Customer-Session` e (b) há um tenant resolvido para a requisição atual. Revalidado: rota de Master sem token → 401 limpo; com token de Master válido → 200; fluxo de sessão de cliente continua 401/200 como antes.

### P0/P1 — BUG-04: colisão de chave de `localStorage`

`@EasyPizza:Token` é usado tanto para o JWT de staff (`AuthContext`) quanto para o `Guid` de sessão do cliente final (`MenuPage`). Funciona "por acidente" hoje porque o backend ignora Bearer tokens inválidos em rotas anônimas, mas com o fix acima (header dedicado) essa colisão deixa de fazer sentido de qualquer forma.

**Correção proposta**: separar as chaves — `@EasyPizza:StaffToken` (JWT) e `@EasyPizza:CustomerSessionToken` (sessão), cada uma enviada no header correto pelo interceptor do axios.

### P1 — BUG-02: `OrderSession` nunca é marcada como usada

`OrderSession.MarkAsUsed()` existe na entidade mas não é chamado em nenhum lugar do código. Na prática, o magic link não é de uso único — só expira por tempo (2h), podendo ser reaproveitado livremente dentro da janela (inclusive por quem quer que tenha acesso ao link, mesmo após o pedido ter sido concluído).

**Correção proposta**: chamar `MarkAsUsed()` quando o pedido é criado com sucesso (`OrderService.CreateOrderAsync`), não no primeiro `GET /customer-info` (o cliente precisa recarregar a página/navegar pelo cardápio várias vezes antes de finalizar, então invalidar no primeiro acesso quebraria a UX). Regra de negócio proposta: **a sessão vale por até 2h OU até o cliente concluir um pedido, o que vier primeiro** — para pedir de novo, ele volta ao WhatsApp e recebe um novo link. Isso é consistente com o modelo "frictionless" e fecha a janela de reuso indevido sem prejudicar a experiência de compra.

### ✅ RESOLVIDO — DEBT-04: segredos versionados em texto puro

`appsettings.json`/`appsettings.Development.json` versionavam a chave de assinatura JWT, as connection strings completas (com senha do Postgres embutida) e a senha padrão do usuário master. Os valores foram removidos dos arquivos versionados (ficaram como string vazia) e agora vêm exclusivamente de variáveis de ambiente — `easypizzab/.env` (real, gitignorado) carregado via `env_file` no serviço `api` do `docker-compose.yml`, com `easypizzab/.env.example` versionado documentando as chaves esperadas (`Jwt__Key`, `ConnectionStrings__MasterConnection`, `ConnectionStrings__DummyTenantConnection`, `MasterDefault__Password`, `POSTGRES_PASSWORD`). Os valores em si não foram trocados nesta correção (só realocados) para não invalidar sessões de staff já ativas nem quebrar o usuário Master já semeado. Validado: stack reiniciou limpo, migrations rodaram, `MasterUser` seed reconheceu o usuário existente, e o fluxo de magic link continuou funcionando.

**Nota de segurança**: os valores antigos já estavam commitados no histórico do git (eram credenciais triviais de dev, ex. senha `1234`, nunca expostas fora do localhost). Não reescrevi o histórico do git — isso exigiria autorização explícita e coordenação com o remoto. Se algum desses valores foi usado além do ambiente local, vale rotacioná-los.

### ✅ RESOLVIDO — DEBT-02: URLs de desenvolvimento hardcoded no bot

`WhatsappBotService.GenerateOrderLinkAsync` agora lê `Frontend:BaseUrlTemplate` da configuração (`{slug}` é substituído pelo slug do tenant atual; default em `appsettings.json` continua sendo o valor de dev `http://{slug}.lvh.me:3333`, sobrescrevível em produção via `Frontend__BaseUrlTemplate`). O fallback perigoso `?? "pizzariabrazil"` também foi removido: se o tenant não for resolvido, o método retorna `null` e o bot simplesmente não envia mensagem (em vez de arriscar apontar pra uma loja errada). `IWhatsappBotService.GenerateOrderLinkAsync` passou a retornar `string?`. Validado via webhook real: link gerado ficou `http://casadapizza.lvh.me:3333/?t=...` com o slug correto.

### ✅ RESOLVIDO — DEBT-03: `baseURL` da API hardcoded no frontend

`src/lib/api.ts` agora usa `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'` — configurável via `docker-compose.yml` do frontend (ver seção 2.2), com o valor de dev como fallback.

### ✅ RESOLVIDO — DEBT-05: duas pastas de Migrations para `MasterDbContext`

`EasyPizza.Infrastructure/Migrations/MasterDb/` (antiga: `InitialMasterDb` + o `ModelSnapshot`) foi movida pra dentro de `EasyPizza.Infrastructure/Data/Migrations/Master/` (onde já estavam as 3 migrations seguintes), com o namespace dos 3 arquivos atualizado de `EasyPizza.Infrastructure.Migrations.MasterDb` pra `EasyPizza.Infrastructure.Data.Migrations.Master`. Pasta antiga removida. Validado com `dotnet ef migrations list --context MasterDbContext` (as 4 migrations aparecem na ordem certa, sem duplicidade) e reiniciando a API algumas vezes (migração do Master e dos tenants continuam rodando limpo no boot).

**Efeito colateral encontrado e corrigido**: o comando de `dotnet ef` via container descartável (documentado no `DOCKER_INSTRUCTIONS.md`) parou de funcionar depois do fix de segredos (P1/DEBT-04) — a API recusa buildar sem `Jwt:Key`, que agora só existe no `.env`. Corrigido adicionando `--env-file .env` ao comando documentado.

### ✅ RESOLVIDO — DEBT-01: endereço único por cliente, apesar do schema suportar múltiplos

Implementado dos dois lados (backend + frontend), validado com teste de ponta a ponta num navegador real (Playwright via Docker, `--network host`, contra a stack rodando de verdade — não só o build).

**Backend**:
- `CustomerAddress` ganhou `Label` (opcional, ex. "Casa"/"Trabalho") — nova migration `AddLabelToCustomerAddress`, aplicada nos dois tenants.
- `ICustomerService`/`CustomerService`: `UpdateCustomerAddressAsync` (que sempre sobrescrevia o primeiro endereço) virou três operações: `GetAddressesAsync` (lista, padrão primeiro), `AddAddressAsync` (cria um novo, sem apagar os existentes — o primeiro endereço do cliente vira padrão automaticamente, os seguintes não, a menos que peçam), `UpdateAddressAsync` (edita um específico, valida que pertence ao cliente, troca o padrão se pedido).
- `CustomersController`: `PUT /{tenantSlug}/address` (singular) virou `GET/POST/PUT /{tenantSlug}/addresses[/{id}]`, todos com `RequireCustomerSession`.
- `SessionInfoResponse` agora retorna `Addresses: []` (lista completa), não só `DefaultAddress`.
- `OrderService.CreateOrderAsync` passou a validar que o `CustomerAddressId` do pedido realmente pertence ao cliente da sessão (não existia essa checagem antes — extensão natural do princípio "nunca confiar identidade vinda do payload" do fix de P0).

**Frontend**: `CheckoutModal` Step 2 agora mostra uma lista de endereços salvos (cards clicáveis, com badge "Padrão") em vez do formulário aparecer direto. Botão "Adicionar novo endereço" abre o formulário (com campo de Label novo), com opção de voltar pra lista. Endereço escolhido/criado é resolvido no momento de finalizar o pedido.

**Extensão pedida depois — editar endereço + tela "Meus Endereços"**: o formulário (CEP/rua/número/bairro/cidade/UF/referência/geolocalização) foi extraído para um componente reutilizável, `src/components/AddressForm`, usado tanto pelo `CheckoutModal` quanto por uma nova página dedicada `src/pages/AddressesPage` (rota `/addresses`, acessível por um botão "Meus Endereços" no cabeçalho do cardápio, ao lado de "Meus Pedidos" — mesmo padrão visual do `OrderTrackerPage`). Cada endereço na lista tem um botão de editar (ícone de lápis) que abre o mesmo formulário pré-preenchido, salvando via `PUT /addresses/{id}` em vez de `POST`. **Cidade e UF ficaram desabilitadas pro cliente digitar** — só são preenchidas automaticamente pela consulta de CEP (pedido explícito do usuário, pra evitar cidade/UF inconsistente com o CEP informado).

**Bug a mais encontrado e corrigido no processo**: ao criar a rota `/addresses`, `getTenantSlugFromUrl()` tratava `"addresses"` como se fosse o próprio slug do tenant (mesma classe do bug do `/tracker` corrigido antes — eu mesmo reproduzi o erro ao esquecer de adicionar a nova rota na lista de exclusão). Trocado por uma constante única `NON_TENANT_PATH_SEGMENTS` compartilhada, evitando esquecer de novo em uma futura rota.

Validado em navegador real: lista mostra os dois endereços existentes, editar abre pré-preenchido (com Cidade/UF desabilitadas e corretas), salvar atualiza a lista imediatamente, e o checkout (usando o mesmo componente) continua funcionando sem regressão — pedido finalizado com sucesso, zero erro de console.

**Extensão pedida em seguida — editar direto no checkout**: o mesmo botão de editar (ícone de lápis) foi adicionado nos cards do seletor de endereço dentro do `CheckoutModal`, não só na página "Meus Endereços". Clicar nele abre o `AddressForm` em modo edição sem sair do checkout; ao salvar, volta automaticamente pro seletor com o endereço editado já selecionado. `.address-edit-btn` foi consolidado em `CheckoutModal.css` (removida a duplicata que existia em `AddressesPage.css`, já que essa página importa o CSS do checkout). Validado em navegador real: os dois cards do checkout mostram o botão de editar, o formulário abre pré-preenchido (Cidade/UF desabilitadas), salvar volta pro seletor com o card certo selecionado, zero erro de console.

**Ajuste de UX pedido em seguida — rodapé duplicado durante edição**: com o formulário de endereço aberto dentro do checkout, o rodapé do step ("Voltar"/"Ir para Pagamento") ficava visível ao mesmo tempo que os botões do próprio formulário ("Cancelar"/"Salvar Endereço") — quatro botões competindo, confuso. Decisão: sem modal nova (evita complexidade de empilhamento) — o rodapé do step 2 agora fica escondido enquanto o formulário está aberto, e o "Cancelar" do formulário virou a única ação de voltar, contextual: se o cliente já tem endereço salvo, fecha o formulário e volta pro seletor; se é o primeiro endereço dele (nada salvo ainda, formulário forçado a abrir), volta direto pro carrinho (Step 1) em vez de deixar a tela em branco. O botão avulso "Usar um endereço salvo" que ficava acima do formulário foi removido por virar redundante com esse "Cancelar" mais esperto. Validado em navegador real nos dois cenários (com e sem endereço salvo), zero erro de console.

**Dois bugs a mais encontrados durante o teste em navegador real** (não estavam no catálogo original, nem relacionados a múltiplos endereços — só apareceram ao testar o fluxo de checkout de ponta a ponta):
1. `SettingsController` e `CouponsController` tinham `[Authorize(Policy = "RequireTenant")]` na classe inteira (mesmo commit `18604f1` que causou o BUG-01 original), bloqueando `GET /settings` e `GET /coupons/validate/{code}` — exatamente os dois endpoints que o checkout do cliente final precisa pra carregar formas de pagamento e aplicar cupom. Corrigido movendo a proteção só pras mutações (`PUT`/`POST`), como já era o padrão correto no resto da API.
2. `getTenantSlugFromUrl()` (frontend) excluía `'tracker'` do fallback de path, então `/tracker/{id}` sem subdomínio caía sempre no tenant fixo errado `"pizzariabrazil"`. Só não aparecia em uso real porque o link do WhatsApp sempre usa subdomínio (`slug.lvh.me`), mas quebrava o modo de teste via path (o mesmo usado pelo botão "Simular Sessão de Teste"). Corrigido lembrando o último slug resolvido nesta sessão (`localStorage`) como fallback, em vez do valor fixo.

### P3 — DEBT-07: sem testes automatizados

Nenhum dos dois repositórios tem projeto de testes. Não é bloqueante para corrigir os bugs acima, mas os fixes de autorização (P0) são exatamente o tipo de lógica que se beneficia de teste automatizado para não regredir de novo.

### ✅ RESOLVIDO — DEBT-06: `AGENTS.md`/`CLAUDE.md` desatualizados quanto a Docker

Os dois repositórios tinham instruções ("nunca assuma uso de Docker, rode `npm`/`dotnet` direto no host") que não refletiam a prática real, e o host de desenvolvimento não tem `npm`/`node` instalado. **Decisão confirmada**: tudo roda via Docker nos dois repositórios (mesmo padrão do projeto nathanbraz.dev), inclusive o backend (que tem `dotnet` no host, mas usa Docker para manter paridade com produção). `easypizza/.agents/AGENTS.md`, `easypizza/CLAUDE.md` e `easypizzab/.agents/AGENTS.md` já foram atualizados.

---

### ✅ RESOLVIDO (era bug confirmado) — filtro de produtos indisponíveis no cardápio público

Investigado e confirmado como bug real: `CatalogRepository.GetCategoriesWithProductsAsync` não filtrava por `Product.IsAvailable` (o campo se chama `IsAvailable`, não `IsActive` como o levantamento inicial supôs). `GET /api/Menu/{tenantSlug}` mostrava produtos marcados como indisponíveis pelo lojista. Corrigido com um filtered include (`Include(c => c.Products.Where(p => p.IsAvailable))`) — só afeta esse endpoint público; a gestão do catálogo no admin usa endpoints diferentes (`/api/Products`, etc.) sem esse filtro, continuando a mostrar tudo pra edição. Validado: marquei um produto como indisponível, sumiu do cardápio público; revertido, voltou a aparecer.

### P3 — DEBT-08: `easypizzab` sem `README.md`

Diferente do frontend (que tem `README.md`), o backend não tem nenhum. Baixo esforço, útil para onboarding de quem entrar no repo.

### P3 — DEBT-09: `EasyPizza.Api.http` com boilerplate desatualizado

Ainda contém o `/weatherforecast` padrão do template do .NET, não reflete os endpoints reais da API (só `teste_whatsapp.http` foi customizado para os testes manuais do bot).

### Nota de produto (não é bug): onboarding de lojista é 100% manual

Criar uma nova loja hoje só é possível via painel Master (`TenantsController.Create`, requer permissão de Master) — não existe fluxo de autoatendimento ("criar minha loja"). Esperado para um SaaS B2B nesta fase, mas registrado aqui porque pode virar demanda de produto mais adiante.

### Nota de produto (não é bug): responsividade mobile pendente

`easypizza/docs/task.md` já sinalizava isso antes desta revisão (`[ ] 5. Revisão Visual — micro-interações e responsividade 100% mobile`). Não está relacionado aos bugs de backend catalogados acima; é polimento de front que segue em aberto independentemente da fase de correções.

## 4. Roadmap sugerido para a próxima fase

1. ✅ **P0** — Implementar `RequireCustomerSession` (header dedicado + validação contra `OrderSessions`) e aplicá-lo em `CustomersController.UpdateAddress` e `OrdersController.CreateOrder`, derivando `CustomerId` do servidor em vez do payload. Resolve BUG-01, BUG-03, BUG-04 numa só mudança coesa. Validado via curl contra a API real (sem sessão → 401, com sessão → 200, `CustomerId` sempre o da sessão).
2. ✅ **P0/P1** — Chamar `OrderSession.MarkAsUsed()` na criação de pedido bem-sucedida (BUG-02). Validado: sessão vira `IsUsed=true` após pedido concluído, e uma tentativa seguinte com o mesmo token já recebe 401.
3. ✅ **P1** — Mover segredos de `appsettings.json` para variáveis de ambiente (DEBT-04). Validado: stack sobe limpo, migrations e seed do Master rodam normalmente.
4. ✅ **P2** — Separar `docker-compose.yml` de frontend e backend; introduzir `VITE_API_URL`; atualizar `DOCKER_INSTRUCTIONS.md` (seção 2.2, DEBT-02, DEBT-03). Validado: as duas stacks sobem independentes e se comunicam via `localhost`.
5. ✅ **P3** — Suporte a múltiplos endereços com `Label` (DEBT-01), com limpeza da pasta de Migrations duplicada (DEBT-05) feita antes.
6. **P3** — Base de testes automatizados cobrindo pelo menos o fluxo de autorização do cliente final (DEBT-07).
7. ✅ **P2** — Confirmar se o cardápio público filtra produtos com `IsActive = false`; corrigir se não filtrar. Era bug real (campo certo é `IsAvailable`) — corrigido e validado.
8. **P3** — Limpeza de documentação: `README.md` no backend (DEBT-08), atualizar `EasyPizza.Api.http` (DEBT-09).

---

### ✅ RESOLVIDO — Tenants antigos sem usuário admin (`casadapizza`)

Achado durante os testes manuais: `TenantsController.Create` cria automaticamente um usuário `admin`/`Admin@123` (papel "Administrador") desde o commit `b6a7df9` (06/08). Tenants criados **antes** dessa data (ex: `casadapizza`, criada em 02/08) nunca passaram por esse passo — não é bug, é só um tenant mais antigo que a feature. Confirmado comparando `Tenant.CreatedAt` vs `ApplicationUser.CreatedAt`: no `top10` (criado depois da feature) a diferença é de ~1s (claramente automático); `casadapizza` simplesmente não tinha usuário nenhum.

O problema real: os endpoints de manutenção (`POST /migrate` e `POST /sync-all`), que existem exatamente pra trazer um tenant mais antigo pro estado atual, não incluíam esse passo — não havia como corrigir isso pela API, só criando o usuário manualmente via SQL.

**Correção**: extraída a criação do admin de `TenantsController.Create` pra um método `EnsureAdminUserAsync` (idempotente — só cria se não existir nenhum usuário com o papel "Administrador"), reaproveitado em `Create`, `MigrateTenant` (`/migrate`) e `SyncAllTenants` (`/sync-all`). Validado: rodei `/migrate` na `casadapizza` → criou o admin; rodei de novo → não duplicou; rodei em `top10` (que já tinha) → não duplicou; login como `admin`/`Admin@123` na `casadapizza` funcionou.

### ✅ RESOLVIDO — boot-time `DatabaseMigrator` derrubava a API inteira por causa de um tenant só

Achado numa conversa sobre o `/sync-all`: `DatabaseMigrator.MigrateDatabasesAsync` (roda uma vez a cada boot da API, antes do `app.Run()`) tinha um único `try/catch` envolvendo a migração do banco Master **e** o loop inteiro de todos os tenants, com `throw;` explícito no catch ("Derruba a API se o banco não puder ser atualizado (Segurança)"). Isso significava que uma falha isolada no banco de **uma única loja** (banco fora do ar, connection string desatualizada, schema alterado manualmente etc.) derrubava a API inteira no boot — nenhuma loja conseguia ser atendida até alguém corrigir manualmente aquele tenant específico, contrariando o próprio motivo de ter banco isolado por tenant.

**Correção**: separado em dois blocos. Falha no banco **Master** continua derrubando a API de propósito (sem ele nenhuma loja é resolvida de qualquer forma — é ponto único de falha real). Falha no banco de **um tenant**, dentro do loop, agora fica isolada num `try/catch` por iteração — loga o erro daquele tenant e segue migrando os outros, igual ao padrão que o `/sync-all` já usava.

**Validado simulando uma falha de verdade**: apontei a connection string da `casadapizza` pra um host inexistente, reiniciei a API — ela subiu normal, logou a falha isolada da `casadapizza`, e a `top10` respondeu 200 o tempo todo (a `casadapizza` respondia 500, como esperado, já que o banco dela estava mesmo inacessível — mas a API nunca caiu). Restaurei a connection string, reiniciei de novo, as duas voltaram a responder 200 normalmente.

## 5. Open questions ainda pendentes

- Pagamento online (Pix via gateway integrado no checkout) — mantido fora de escopo por ora.
- Cálculo de taxa de entrega por distância/GPS em vez de valor fixo por loja — mantido fora de escopo por ora.
- Domínio wildcard (`*.easypizza.com.br`) e onde hospedar em produção — a definir quando chegarmos na fase de deploy (Kamal, conforme já usado em outros projetos do autor).
- ~~Padronização de execução Docker-vs-host nos dois repositórios (DEBT-06)~~ — resolvido: tudo via Docker.
