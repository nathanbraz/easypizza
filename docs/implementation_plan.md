# SaaS de Pedidos via WhatsApp (Multi-tenant)

Este documento detalha a proposta arquitetural inicial e as ideias para a modelagem do sistema SaaS de delivery focado na experiência sem atritos via WhatsApp.

> [!TIP]
> A grande sacada deste sistema é o modelo "Frictionless" (sem fricção). O cliente final odeia criar senhas e preencher cadastros longos para pedir comida. O uso de *Magic Links* baseados no número do WhatsApp é a melhor escolha de UX possível.

## User Review Required
> [!IMPORTANT]
> Revise as novas adições ao modelo de banco de dados (Múltiplos Endereços com GPS, Configurações de Loja e Adicionais de Produto).

## Open Questions
> [!WARNING]
> Tenho algumas dúvidas estratégicas para definirmos antes de programar:
> 1. **Integração do WhatsApp**: Você pretende usar a API Oficial da Meta (Facebook), Twilio, ou alguma biblioteca open-source que emula o WhatsApp Web (ex: Baileys, Evolution API)?
> 2. **Gerenciamento de Domínios**: Para gerenciar múltiplos subdomínios dinamicamente (`*.sistema.com`), precisaremos configurar DNS coringa (wildcard). Você já tem alguma plataforma de Cloud em mente para hospedar tudo isso no futuro (Azure, AWS, Vercel)?
> 3. **Pagamentos**: O pagamento será feito no ato da entrega (dinheiro/maquininha na porta) ou você quer processar pagamentos online (Pix, Cartão) dentro do próprio link do pedido?
> 4. **Taxa de Entrega**: Você prefere calcular a taxa de entrega baseada por **Bairro** ou de forma dinâmica usando a distância em Km (**Latitude/Longitude** gerada pelo GPS do cliente)?

## Fluxo do Cliente (Magic Link via WhatsApp)
1. **Gatilho**: Cliente manda mensagem no WhatsApp da pizzaria.
2. **Auto-resposta**: O sistema de bot responde com o menu inicial ("Digite 1 para fazer pedido").
3. **Geração do Link**: O backend em .NET gera uma `OrderSession` (Sessão de Pedido) atrelada ao ID da pizzaria (`TenantId`) e ao Telefone do cliente. Um token único criptografado (de uso único e expirável) é gerado na hora.
4. **Acesso**: Cliente clica no link recebido: `https://pizzabraz.sistema.com/menu?token=XYZ123`.
5. **Autenticação Invisível**: O sistema lê o token, identifica a empresa, extrai o telefone do cliente, busca o histórico dele e exibe o cardápio com os dados dele já preenchidos.
6. **Fechamento**: Após enviar o pedido para a pizzaria, o token é invalidado (ou expira por tempo estipulado), protegendo o sistema de usos indevidos futuros.

## Proposed Architecture & Multi-Tenancy

### Backend (.NET C# Web API)
Como o sistema abrigará várias empresas, usaremos a abordagem de **Banco de Dados Único com Separação Lógica** (a mais performática e barata para iniciar um SaaS). 
- Todas as tabelas principais terão uma coluna `TenantId` (ID da Empresa). 
- **Filtro Global (EF Core Query Filters)**: Configuraremos o Entity Framework para que **toda** consulta ao banco seja automaticamente filtrada pelo `TenantId` da requisição atual. Isso garante matematicamente que a Pizzaria A nunca vai ver ou vazar os pedidos da Hamburgueria B.
- **Middleware de Subdomínio**: Criaremos um middleware no ASP.NET que intercepta a requisição, lê o subdomínio da URL (ex: `burguertop`) e injeta o `TenantId` no contexto da aplicação.

### Frontend (React JS)
- Existirá apenas um repositório React. 
- O frontend vai olhar para a URL acessada. Se for `burguertop.sistema.com`, ele busca na API as cores primárias, logo e o cardápio da Hamburgueria, moldando o tema inteiro dinamicamente (White-label).
- **Área Administrativa**: Rotas protegidas (ex: `/admin`) onde o dono da pizzaria fará login (com email/senha tradicional) para ver os pedidos chegando em tempo real (provavelmente usaremos **SignalR** para comunicação Websocket em tempo real).

## Database Schema Proposal (Entity Framework Core)

### 1. Entidades de Administração (SaaS)
- **Tenant (Empresas)**
  - `Id`, `Name`, `Subdomain`, `WhatsAppNumber`, `ThemeColor`, `LogoUrl`, `IsActive`
- **TenantSettings (Configurações da Loja)**
  - `Id`, `TenantId`
  - `IsOpen` (Booleano para o gerente pausar os pedidos se a cozinha lotar)
  - `OpeningTime`, `ClosingTime` (Horário de funcionamento automatizado)
  - `MinimumOrderValue` (Valor mínimo para delivery)
- **User (Usuários do Admin)**
  - `Id`, `TenantId`, `Role` (Owner, Manager, SuperAdmin), `Email`, `PasswordHash`

### 2. Entidades do Cliente (Frictionless)
- **Customer (Cliente)**
  - `Id`, `TenantId`, `PhoneNumber`, `Name`
- **CustomerAddress (Endereços Múltiplos)**
  - `Id`, `CustomerId`
  - `Street`, `Number`, `Complement`, `Neighborhood`, `City`, `State`, `ZipCode`
  - `Latitude`, `Longitude` (Armazenamento de GPS para enviar a rota exata ao motoboy via Maps)
  - `Label` (Ex: "Casa", "Trabalho", "Namorada")
  - `IsDefault` (Endereço padrão selecionado)
- **OrderSession (Magic Links)**
  - `Id`, `TenantId`, `PhoneNumber`, `Token`, `CreatedAt`, `ExpiresAt`, `IsUsed`

### 3. Entidades de Negócio (Cardápio e Pedidos)
- **ProductCategory (Categoria do Cardápio)**
  - `Id`, `TenantId`, `Name` (Ex: "Pizzas Tradicionais", "Promoções")
- **Product (Produto)**
  - `Id`, `TenantId`, `CategoryId`, `Name`, `Description`, `BasePrice`, `ImageUrl`, `IsActive`
- **ProductAddon (Adicionais e Variações de Pizza)**
  - `Id`, `ProductId`, `Name` (Ex: "Borda de Catupiry", "Metade Calabresa")
  - `AdditionalPrice`, `MaxChoices` (Para limitar escolhas do cliente)
- **Order (Pedido)**
  - `Id`, `TenantId`, `CustomerId`
  - `CustomerAddressId` (O endereço exato que foi usado para essa entrega)
  - `Status` (Pending, Preparing, OutForDelivery, Delivered, Canceled)
  - `TotalAmount`, `DeliveryFee` (Taxa de Entrega calculada)
  - `PaymentMethod` (Dinheiro, Pix, Cartão na Entrega, etc.)
  - `CreatedAt`
- **OrderItem (Itens do Pedido)**
  - `Id`, `OrderId`, `ProductId`, `Quantity`, `UnitPrice`
  - *Obs: Será vinculada aos Adicionais escolhidos para saber se a pizza foi meio a meio.*
