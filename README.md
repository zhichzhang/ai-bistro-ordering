# AI Bistro Ordering


<p>
  <!-- Language & Frontend -->
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Zustand-5-443E38" alt="Zustand" />

  <!-- Backend & Database -->
  <img src="https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />

  <!-- AI -->
  <img src="https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Gemini-8E75B2?logo=googlegemini&logoColor=white" alt="Gemini" />

  <!-- Testing -->
  <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Supertest-API_Testing-333333" alt="Supertest" />
  <img src="https://img.shields.io/badge/Integration-Testing-2E7D32" alt="Integration Testing" />

  <!-- Load & Performance Testing -->
  <img src="https://img.shields.io/badge/Grafana_k6-Load_Testing-7D64FF?logo=k6&logoColor=white" alt="Grafana k6" />
  <img src="https://img.shields.io/badge/Performance-Benchmarking-007ACC" alt="Performance Benchmarking" />

  <!-- Cloud & Infrastructure -->
  <img src="https://img.shields.io/badge/Google_Cloud-4285F4?logo=googlecloud&logoColor=white" alt="Google Cloud" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>


AI Bistro Ordering is a full-stack restaurant ordering application built with React Native, Expo, and an Express API. Guests can explore the menu, customize items, manage their cart, and place orders using either direct interactions or natural language.

Its central design choice is to **separate LLM interpretation from application state changes**. A multi-stage backend pipeline turns conversational requests into typed actions, resolves them against the actual menu and cart, and delegates validated changes to deterministic services. The model does not receive direct database-write access.

## Demo and web edition

<p align="center">
  <a href="https://www.youtube.com/shorts/E6LAJtAj_kY">
    <img
      src="https://img.youtube.com/vi/E6LAJtAj_kY/maxresdefault.jpg"
      alt="Watch the AI Bistro Ordering demo on YouTube"
      width="650"
    />
  </a>
</p>

<p align="center">
  <a href="https://www.youtube.com/shorts/E6LAJtAj_kY">Watch the AI Bistro Ordering demo on YouTube</a>
</p>

[**MenuMuse**](https://menumuse.app.space/) is a separately implemented browser edition adapted from this project. It retains the distinction between AI interpretation and trusted cart execution, but uses React and DeepSpace instead of this repository's Expo and Express/Prisma backend. [MenuMuse source](https://github.com/zhichzhang/menumuse).


<details>
<summary><strong>Contents</strong></summary>

- [Demo and web edition](#demo-and-web-edition)
- [Capabilities](#capabilities)
- [Tech stack](#tech-stack)
  - [AI Bistro Ordering — Mobile client](#ai-bistro-ordering--mobile-client)
  - [AI Bistro Ordering — Backend and data](#ai-bistro-ordering--backend-and-data)
  - [MenuMuse — Web edition](#menumuse--web-edition)
- [Architecture](#architecture)
- [Conversational ordering pipeline](#conversational-ordering-pipeline)
- [Cart state and checkout](#cart-state-and-checkout)
- [Concurrency and transaction safety](#concurrency-and-transaction-safety)
- [Persistence](#persistence)
- [API](#api)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Testing](#testing)
- [Concurrency and performance benchmarks](#concurrency-and-performance-benchmarks)
- [Scope and limitations](#scope-and-limitations)
- [License](#license)

</details>


## Capabilities

- **Conversational and manual ordering.** Browse the categorized menu, choose modifiers, and use natural language to add or edit cart items.
- **Multi-action interpretation.** Normalize compound instructions into ordered actions, with support for quantities, modifiers, dependencies, and references to prior actions.
- **Menu-grounded resolution.** Match requests to canonical menu items and configured aliases; reject unsupported items and modifier selections rather than inventing products.
- **Interactive clarification.** Ambiguous item choices can appear in an animated drawer below the AI prompt. Selecting an option sends the answer back through the ordering pipeline; the backend retains the pending add action's original quantity and modifiers.
- **Modifier-aware pricing.** Menu options include price deltas. Validated modifiers contribute to the cart line's calculated unit and line totals.
- **Deterministic cart operations.** Add, remove, replace modifiers, change quantity, or clear the cart, with canonical line identities that merge equivalent configurations.
- **Checkout and session rotation.** Submitting a nonempty cart marks it submitted and creates a fresh cart and chat session; the client animates the floating cart during the transition.
- **Inspectable history.** Persist chat messages and ordering-action records alongside menu and cart data.
- **Concurrency-safe cart and AI operations.** Use PostgreSQL row-level locks, active-cart validation, and per-session turn admission to reject conflicting requests; deterministic stress tests verify the behavior.

## Tech stack

AI Bistro Ordering and MenuMuse share the conversational ordering concept but have **separate application stacks**. The following technologies are confirmed in their respective repositories.

### AI Bistro Ordering — Mobile client

| Technology | Role |
| --- | --- |
| **TypeScript, React 19, React Native 0.81** | Typed UI components and application interactions |
| **Expo 54** | Mobile development, platform tooling, and app configuration |
| **React Native Web 0.21** | Browser target for the Expo client (separate from MenuMuse) |
| **Zustand 5** | Client-side cart, session, and UI state |
| **Expo Image, Expo Linear Gradient** | Menu imagery and visual effects |
| **React Native Animated** | Interactive UI transitions, including clarification and floating-cart animations |

### AI Bistro Ordering — Backend and data

| Technology | Role |
| --- | --- |
| **Node.js, TypeScript, Express 5** | REST API and application services |
| **OpenAI / Google Gemini** | Configurable LLM providers for ordering interpretation and resolution |
| **Google Gen AI SDK** | Gemini provider integration |
| **PostgreSQL** | Persistent menu, carts, conversations, and ordering records |
| **Prisma 7, Prisma PostgreSQL adapter, node-postgres (`pg`)** | Database schema, migrations, typed queries, and PostgreSQL connectivity |
| **Vitest 4, Supertest 7** | Service and HTTP API testing |
| **tsx** | TypeScript server execution and development watch mode |

### MenuMuse — Web edition

[**MenuMuse live demo**](https://menumuse.app.space/) · [**Source repository**](https://github.com/zhichzhang/menumuse)

| Technology | Role |
| --- | --- |
| **TypeScript, React 19, React DOM** | Browser application and component architecture |
| **React Router 7** | Page navigation, including authenticated routes |
| **Vite 8** | Development tooling and production builds |
| **Tailwind CSS 4, Base UI, Lucide React** | Styling, accessible UI primitives, and icons |
| **DeepSpace SDK / backend** | Authentication, user-scoped records, server actions, and real-time subscriptions |
| **Hono, Cloudflare Workers tooling** | Worker-side HTTP routing and build/runtime integration |
| **OpenAI via DeepSpace integration, AI SDK** | Natural-language ordering and AI chat integration |
| **Zod 4** | Runtime schemas and input validation |
| **Vitest, Playwright, DeepSpace test tooling** | Unit, browser, and platform testing |
| **ESLint, TypeScript compiler** | Static code quality and type checking |

MenuMuse uses DeepSpace-managed persistence rather than the mobile repository's Prisma/PostgreSQL service. Its OpenAI integration is distinct from the mobile backend's configurable OpenAI/Gemini provider setup. Dependencies used only as supporting implementation utilities are intentionally omitted from this overview.

## Architecture

```mermaid
flowchart LR
    APP["Expo / React Native UI"] --> STATE["Zustand state"]
    APP --> API["Express REST API"]
    API --> ORDER["OrderingService"]
    ORDER --> NORM["NormalizationService"]
    ORDER --> RESOLVE["ResolutionService"]
    NORM --> MODEL["OpenAI or Gemini"]
    RESOLVE --> MODEL
    ORDER --> CART["CartService"]
    API --> CART
    ORDER --> CHAT["Chat / action persistence"]
    CART --> REPO["Prisma repositories"]
    CHAT --> REPO
    REPO --> DB[("PostgreSQL")]
```

The UI uses React Native components, Expo, and Zustand for the active cart, session, and interaction state. The Express API coordinates the ordering pipeline and direct cart operations. Prisma repositories manage persistent records in PostgreSQL; LLM adapters are used for interpretation and resolution, not for performing writes. The backend can use OpenAI or Gemini as selected by configuration.

## Conversational ordering pipeline

```mermaid
flowchart TD
    USER["Natural-language request"] --> CONTEXT["Menu, cart and recent-action context"]
    CONTEXT --> NORMALIZE["Normalize ordered typed actions"]
    NORMALIZE --> RESOLVE["Resolve against menu and cart"]
    RESOLVE --> DECIDE{"Resolved?"}
    DECIDE -- "Ambiguous" --> OPTIONS["Question and candidate options"]
    OPTIONS --> SELECT["User selects an option"]
    SELECT --> RESOLVE
    DECIDE -- "Valid" --> VALIDATE["Validate menu item and modifiers"]
    VALIDATE --> EXEC["Deterministic cart mutation"]
    EXEC --> NEXT{"More actions?"}
    NEXT -- "Yes" --> RESOLVE
    NEXT -- "No" --> SAVE["Persist result and return refreshed cart"]
    DECIDE -- "Invalid" --> ERROR["Return error or partial failure"]
```

### Prompt context and normalization

`PromptContextService` prepares the current cart, prompt-safe menu data, recent actions, and references that may matter to the request. `NormalizationService` converts the user's message into typed operations rather than forwarding unstructured text to the cart service. Compound requests preserve their action order and dependency metadata.

### Menu and cart resolution

`ResolutionService` grounds normalized targets against real menu entries, aliases, cart positions, prior action results, and session context. The resulting payload is validated before execution. Requests that cannot uniquely identify an item can return `needs_clarification` and candidate suggestions.

The frontend's `ClarificationDrawer` displays candidate products as selectable buttons. A selection is sent as a reply in the same chat session. For pending add-item clarifications, the backend reconstructs the saved action with the selected product, retaining its original quantity and modifiers instead of treating the choice as a fresh one-item order.

### Deterministic execution

`CartService` owns cart mutations and pricing checks. Menu-item IDs, selected modifiers, and quantity changes are verified against persisted product data. Actions in a compound message are processed in order, with refreshed cart context available to later actions. The response records errors or partial failures rather than assuming every proposed action succeeded.

For a broader explanation of the design and implementation, see the [project write-up](https://zhichzhang.dev/2026-07-17/ai-bistro-ordering).

## Cart state and checkout

Two cart lines are equivalent only when they refer to the same menu item and normalized modifier configuration. The cart service constructs a canonical identity from these values, then merges quantities for equivalent lines. Database-backed cart transactions use row locking to coordinate mutations to an individual cart.

Modifier choices are stored as structured records with `price_delta_cents` values. Cart services calculate totals from the base menu price plus applicable modifier deltas, rather than trusting a client-supplied price.

`POST /api/carts/:cartId/checkout` submits a nonempty cart, increments its revision, and creates a new cart with an associated chat session. The client replaces its active identifiers and plays the floating-cart exit/return animation. This is a **preview checkout**: it generates an order confirmation response but does not charge a payment method or fulfill a restaurant order.

## Concurrency and transaction safety

Cart mutations and checkout operate inside Prisma interactive transactions that lock the target cart row with PostgreSQL `SELECT ... FOR UPDATE`. While the lock is held, the service checks that the cart remains `active`, preventing a second checkout or a late mutation from updating a submitted cart. A checkout of an empty cart returns a controlled client error rather than a server exception.

Repositories share the active Prisma transaction through a Node.js `AsyncLocalStorage` context (`db()`). The menu repository was updated to use that context instead of issuing unconditional queries through the global Prisma client; controlled multi-kiosk benchmarks documented a large reliability improvement after this change. This is a **transaction-context consistency fix**, not a claim of a formally proven driver-level deadlock.

Concurrent requests against the **same chat session** are handled with a process-local AI turn guard. An overlapping turn receives HTTP `409 TURN_IN_PROGRESS` and may be retried after the first turn completes. The server does **not** automatically queue turns, and this guard is not shared across multiple backend replicas.

Details and recorded invariants are documented in the [benchmark protocols](benchmarks/README.md) and [quantitative analysis](benchmarks/reports/concurrency-performance-analysis.md).

## Persistence

The PostgreSQL schema is defined in [`apps/server/prisma/schema.prisma`](apps/server/prisma/schema.prisma); versioned SQL migrations are in [`apps/server/prisma/migrations`](apps/server/prisma/migrations).

| Domain | Stored data |
| --- | --- |
| Menu | Categories, items, aliases, modifier groups, modifier options and menu-to-modifier relationships |
| Cart | Carts, positioned cart lines, selected modifiers, prices, canonical identities and revisions |
| Conversation | Chat sessions and user/assistant messages |
| Orchestration | Normalized actions, dependencies, references, resolved item IDs and execution status |

The seed inputs are [`packages/shared/menu.json`](packages/shared/menu.json) for the menu catalogue and [`packages/shared/menu-pricing.json`](packages/shared/menu-pricing.json) for modifier surcharges and add-ons. The script at `apps/server/src/scripts/ingestion.script.ts` imports these into the database. Both files must be present before running ingestion.

## API

All endpoints are prefixed by `/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `GET` | `/menu` | Menu response |
| `GET` | `/menu/categories` | Categories |
| `GET` | `/menu/items` | Menu items |
| `GET` | `/menu/items/:itemId` | Individual menu item |
| `GET` | `/menu/context` | Prompt-safe menu context |
| `POST` | `/carts` | Create a cart and chat session |
| `GET` | `/carts/:cartId` | Hydrated cart |
| `GET` | `/carts/:cartId/summary` | Cart summary |
| `POST` | `/carts/:cartId/items` | Add a cart line |
| `PATCH` | `/carts/:cartId/items/:cartItemId` | Update quantity or modifiers |
| `PUT` | `/carts/:cartId/items/:cartItemId` | Replace a cart line |
| `DELETE` | `/carts/:cartId/items/:cartItemId` | Decrement or remove an item |
| `POST` | `/carts/:cartId/clear` | Clear a cart |
| `POST` | `/carts/:cartId/checkout` | Submit cart and rotate session |
| `POST` | `/chat/sessions` | Create a chat session |
| `GET` | `/chat/sessions/:sessionId/messages` | Session messages |
| `POST` | `/ordering/sessions/:sessionId/turn` | Interpret and execute an ordering turn |

Example request after creating a session:

```bash
curl -X POST http://localhost:3000/api/ordering/sessions/SESSION_ID/turn \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"Add two chicken sandwiches"}'
```

## Project structure

```text
apps/
  mobile/
    App.tsx
    src/
      components/       # Menu cards, AI prompt, clarification drawer, cart sheet
      overlays/         # Floating cart, modifier editor and toasts
      screens/          # Main ordering screen and splash
      services/         # Backend API clients
      store/            # Zustand state
  server/
    prisma/             # Prisma schema and migrations
    src/
      routes/           # REST endpoints
      services/         # AI pipeline and cart business logic
      db/repositories/  # Database operations
      mappers/          # Persistence-to-domain conversions
      prompts/          # Normalization and resolution instructions
      scripts/          # Menu ingestion
benchmarks/
  README.md             # Local benchmark setup and scenarios
  docs/                 # Per-scenario procedures and invariants
  reports/              # Quantitative before/after analysis
  scripts/              # Benchmark runners and parsers
  results/              # Archived before/after and regression CSVs
packages/
  shared/
    menu.json           # Menu catalogue
    menu-pricing.json   # Modifier surcharges and add-ons
```

## Local development

**Prerequisites:** Node.js and npm, a PostgreSQL database, and an API key for the configured LLM provider. The Expo app and Express server have separate `package.json` files and must be started separately.

### 1. Create a PostgreSQL database

Create an empty PostgreSQL database using your preferred provider (for example, a new Supabase project or a local PostgreSQL instance). Record its **database name, host, port, username, and password** to construct the connection URLs below. For a local PostgreSQL installation, one way to create a database is:

```bash
createdb -U postgres ai_bistro_ordering
```

If your provider creates a database automatically, do **not** run `createdb`; simply use the connection details it provides. For Supabase, copy the PostgreSQL connection details from the project's database connection settings, and use the provider-recommended direct/session connection for migration operations. Ensure the connection is accessible from the computer running Prisma.

The database tables, constraints, functions, and triggers are managed through the versioned migrations in `apps/server/prisma/migrations/`. There is no separate `packages/shared/schema.sql` setup step.

### 2. Configure the server

From the repository root:

```bash
cd apps/server
npm ci
```

Create `apps/server/.env` with the following variables (values shown as placeholders):

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
LLM_PROVIDER=openai
OPENAI_API_KEY=
# Optional overrides:
# OPENAI_MODEL=gpt-4o-mini
# GEMINI_API_KEY=
# GEMINI_MODEL=gemini-2.5-flash
# CORS_ORIGINS=http://localhost:8081
```

`DIRECT_URL` is the connection used for Prisma migrations, falling back to `DATABASE_URL` when unset. For Gemini, set `LLM_PROVIDER=gemini` and provide `GEMINI_API_KEY` instead. The API key belongs on the server, not in the Expo application's public environment variables. In production, the server restricts browser origins using the optional comma-separated `CORS_ORIGINS` setting.

### 3. Create tables and seed the menu

```bash
# From apps/server
npm run db:generate
npm run db:deploy
npm run ingest
```

`npm run db:deploy` applies the versioned migrations to the empty database. `npm run ingest` then loads the menu and modifier configuration. These commands do **not** create the PostgreSQL database itself: create that first in Step 1.

Before running ingestion, verify that both `packages/shared/menu.json` and `packages/shared/menu-pricing.json` are present. If an existing database already contains tables, **do not** reinitialize it as a fresh database: review the migration history and data first. The repository provides `npm run db:baseline` to mark the initial schema as applied when appropriate; it is not a substitute for verifying that the actual schema matches.

### 4. Start the API

```bash
# From apps/server
npm run dev
```

The server listens on `http://localhost:3000`, with routes under `/api`.

### 5. Configure and start the Expo app

In a second terminal:

```bash
cd apps/mobile
npm ci
```

Create `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000/api
```

For Android/iOS on a physical device, use your development machine's reachable LAN IP rather than `localhost`. For local web development, `http://localhost:3000/api` may be used when the browser and API are on the same machine.

```bash
# From apps/mobile
npm run start
```

Choose the target in Expo, or run `npm run web`, `npm run android`, or `npm run ios` as appropriate for your development environment.

### Basic verification

Once the database has been seeded and both applications are running, browse the menu, add an item manually, then try an AI request such as `Add two sandwiches.` Select a suggested product if the system asks for clarification, check the resulting quantity and price, and submit a nonempty cart to verify session rotation.

## Testing

The backend includes Vitest tests for menu and cart services, chat handling, normalization, resolution, orchestration and HTTP routes using Supertest. Run them from `apps/server`:

```bash
npm run test:run
```

Use `npm test` for watch mode. The database connectivity test runs only when `DATABASE_URL` is present. These tests are not a substitute for verifying a configured LLM provider or a real checkout flow in the app.

For database-backed race, regression and local mock-LLM load scenarios, see [`benchmarks/README.md`](benchmarks/README.md). Run these only against a **dedicated local benchmark database**; k6 and a local mock provider are required for the corresponding scenarios.

## Concurrency and performance benchmarks

We evaluated **single-cart contention**, **cart lifecycle races**, **same-session AI turn overlap**, and **independent multi-kiosk ordering** against a separate local PostgreSQL database. AI tests used a deterministic mock LLM and a single Express process; all figures describe **controlled test workloads**, not production capacity or payment processing.

| Experiment | Before fix | After fix | Later regression |
| --- | ---: | ---: | ---: |
| Duplicate checkout (20/50/100 parallel attempts per cart, 3 repeats) | 501 extra successful checkout responses / 510 attempts | **0** extra; 9 accepted, 501 expected HTTP 409 | 9/9 rounds correct |
| Cart lifecycle (checkout vs add/update/clear) | 6 diagnostic rounds; harness misclassified some valid outcomes; one empty-cart HTTP 500 | **90/90** rounds correct | 30/30 correct |
| Same-session AI turns (Add → Clear) | **0/30** semantic order matches in controlled race | **30/30** correct with rejection and explicit retry; **60/60** across both scenarios | 4/4 correct |
| Multi-kiosk workflow (5–100 concurrent kiosks, 3 repeats each) | **58/555** completed | **555/555 (100%)** completed | Final full after-fix run |

At **10 concurrent kiosks**, mean per-wave AI request P95 decreased from **5,166.59 ms** to **187.69 ms** (approximately **96.4%**). The before-fix latency population includes **failed business responses**, so this is not a like-for-like comparison of successful AI requests. In the fixed build, mean completed preview-order throughput across three waves ranged from **18.91 to 24.85 orders/s** at 5–20 kiosks and was **22.92 orders/s** at 100 kiosks; these **short-wave completion rates** are not sustained throughput benchmarks.

For exact test definitions, scripts, per-load results and archived CSVs, see the [benchmark guide](benchmarks/README.md) and [full quantitative report](benchmarks/reports/concurrency-performance-analysis.md). The recorded results do not establish multi-replica correctness, live provider latency or long-duration production scalability.

## Scope and limitations

- The natural-language ordering interface currently expects English input.
- Checkout confirms a simulated order, not a payment transaction; restaurant fulfillment is not implemented.
- The repository does not implement customer authentication or production deployment automation.
- The separate MenuMuse web edition has its own authenticated user records, order history, server actions and deployment configuration. These are not features of this Expo/Express repository.

## License

Copyright © 2026 Zhicheng Zhang. Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).
