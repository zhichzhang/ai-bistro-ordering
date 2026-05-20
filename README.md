# AI Bistro Ordering

AI Bistro Ordering is a full-stack AI-powered restaurant ordering system that combines a React Native mobile client with a structured TypeScript backend orchestration pipeline. A demo of the system can be viewed [here](https://drive.google.com/file/d/1e5pTwEDpvV8tliRmef4UGqQQuH1uh_aW/view?usp=sharing).

Instead of allowing the LLM to directly mutate application state, the backend separates the AI workflow into deterministic orchestration stages including normalization, menu resolution, and cart execution.

The project focuses heavily on:

* Structured AI orchestration
* Deterministic cart execution
* Menu and modifier resolution
* Prompt-context engineering
* Typed backend architecture
* Stable cart state management
* AI-assisted conversational ordering



# Highlights

## Structured AI Orchestration Pipeline

The backend separates the AI workflow into multiple execution stages:

1. Prompt context generation
2. Action normalization
3. Menu resolution
4. Deterministic cart execution
5. Cart synchronization

This avoids allowing the LLM to directly control database mutations.



## Prompt Context Transformation Layer

Before normalization, the backend transforms raw database state into structured prompt-friendly context optimized for LLM reasoning.

This includes:

* Cart state serialization
* Modifier serialization
* Menu context formatting
* Execution history formatting
* Conversational context shaping

The goal is to improve reasoning consistency and reduce ambiguity during AI ordering execution.



## Deterministic Cart Execution

Cart mutations are executed by backend services instead of AI-generated logic.

The execution layer handles:

* Quantity merging
* Modifier replacement
* Stable cart item identity
* Item removal
* Modifier synchronization
* Stateful cart updates



## Adapter-Oriented Menu Resolution

The backend resolves AI-generated menu references into executable entities using structured resolution logic.

This includes:

* Alias matching
* Modifier validation
* Menu entity resolution
* Structured menu lookup
* Resolution confidence handling



## Typed Full-Stack Architecture

The entire project is written in TypeScript.

The architecture is separated into:

* Repository layer
* Service layer
* Route layer
* Prompt layer
* Mapping layer
* Domain types
* DTO contracts



# Tech Stack

## Backend

* TypeScript
* Node.js
* Express
* Supabase
* PostgreSQL
* Google Gemini API
* Vitest
* TSX
* Supertest

## Mobile

* React Native
* Expo
* Expo Go
* TypeScript
* Zustand



# Project Structure

```txt
apps/
├── mobile/     # React Native Expo client
└── server/     # Express + AI orchestration backend
```



# Environment Setup

## Backend Environment

Create:

```txt
apps/server/.env
```

Required variables:

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GEMINI_MODEL=
```



## Mobile Environment

Create:

```txt
apps/mobile/.env
```

Required variables:

```env
EXPO_PUBLIC_API_BASE_URL=http://{IP}:{PORT}/api
```



# Database Setup

This project uses PostgreSQL through Supabase.

1. Create a Supabase project
2. Open the SQL editor
3. Run:

```txt
/packages/shared/schema.sql
```

This creates all required database tables for:

* Menu entities
* Modifier groups
* Modifier options
* Cart state
* Chat sessions
* Chat messages
* Conversational ordering workflows
* Structured AI execution tracking



# Backend Setup

## 1. Install Dependencies

```bash
cd apps/server
npm install
```



## 2. Configure Environment Variables

Create:

```txt
apps/server/.env
```

Then populate all required variables.



## 3. Run Database Schema

Execute:

```txt
/packages/shared/schema.sql
```

inside the Supabase SQL Editor.



## 4. Ingest Menu Data

The backend includes a menu ingestion pipeline.

Run:

```bash
cd apps/server
npm run ingest
```

This executes:

```txt
apps/server/src/scripts/ingestion.script.ts
```

The ingestion pipeline imports menu data into PostgreSQL.



## 5. Start Backend Server

```bash
cd apps/server
npm run dev
```

The Express server will start in watch mode.



# Mobile Setup

## 1. Install Dependencies

```bash
cd apps/mobile
npm install
```



## 2. Configure Environment Variables

Create:

```txt
apps/mobile/.env
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://{IP}:{PORT}/api
```



## 3. Start Expo

```bash
cd apps/mobile
npm run start
```

Then:

* Scan the QR code using Expo Go

Or run:

```bash
npm run ios
```

```bash
npm run android
```

```bash
npm run web
```



# Backend Structure

## API Routes

Located in:

```txt
apps/server/src/routes/
```

### Available APIs

| Route                | Responsibility                            |
| ----------------- | ----------------------------------------- |
| `cart.routes.ts`     | Cart CRUD and cart state synchronization  |
| `chat.routes.ts`     | Chat session and conversational messaging |
| `menu.routes.ts`     | Menu and category retrieval               |
| `ordering.routes.ts` | AI ordering orchestration pipeline        |
| `health.routes.ts`   | Health check endpoints                    |



## Service Layer

Located in:

```txt
apps/server/src/services/
```

### Core Services

| Service                     | Responsibility                                              |
| --------------------------- | ----------------------------------------------------------- |
| `normalization.service.ts`  | Converts natural language into structured ordering actions  |
| `prompt-context.service.ts` | Transforms raw cart/menu JSON into prompt-optimized context |
| `resolution.service.ts`     | Resolves menu entities, modifiers, and aliases              |
| `ordering.service.ts`       | Coordinates the end-to-end AI ordering pipeline             |
| `cart.service.ts`           | Deterministic cart mutation and synchronization             |
| `menu.service.ts`           | Menu aggregation and lookup logic                           |
| `chat.service.ts`           | Chat session persistence and history management             |
| `gemini.service.ts`         | Google Gemini API integration                               |



## Prompt Layer

Located in:

```txt
apps/server/src/prompts/
```

Contains structured prompts for:

* Action normalization
* Menu reasoning
* Conversational ordering
* Resolution flows



## Database Layer

Located in:

```txt
apps/server/src/db/
```

Responsible for:

* Supabase integration
* Repository abstraction
* PostgreSQL persistence



# Mobile Structure

## Components

Located in:

```txt
apps/mobile/src/components/
```

### Core Components

| Component                        | Responsibility                   |
| -------------------------------- | -------------------------------- |
| `ai-prompt-bar.component.tsx`    | Conversational AI ordering input |
| `cart-item-row.component.tsx`    | Cart item rendering              |
| `cart-sheet.component.tsx`       | Cart drawer and checkout state   |
| `category-rail.component.tsx`    | Menu category navigation         |
| `menu-item-card.component.tsx`   | Menu item presentation           |
| `quantity-stepper.component.tsx` | Quantity adjustment controls     |



## Overlays

Located in:

```txt
apps/mobile/src/overlays/
```

| Overlay                      | Responsibility              |
| ---------------------------- | --------------------------- |
| `floating-cart.overlay.tsx`  | Floating cart access UI     |
| `modifier-sheet.overlay.tsx` | Modifier selection workflow |
| `toast-host.overlay.tsx`     | Global toast notifications  |



## Frontend Services

Located in:

```txt
apps/mobile/src/services/
```

| Service               | Responsibility           |
| --------------------- | ------------------------ |
| `api.service.ts`      | Base HTTP client         |
| `menu.service.ts`     | Menu API integration     |
| `cart.service.ts`     | Cart synchronization     |
| `chat.service.ts`     | Conversational messaging |
| `ordering.service.ts` | AI ordering requests     |



## Frontend State Management

The mobile application uses Zustand for:

* Cart state
* Ordering state
* Chat state
* UI synchronization



# AI Ordering Flow

## Step 1 — User Message

* User sends a natural language ordering request
* Example: `"Add two cheeseburgers with no onions"`



## Step 2 — Prompt Context Generation

The backend transforms raw JSON state into structured prompt-friendly context.

This includes:

* Cart serialization
* Modifier formatting
* Menu context formatting
* Execution history formatting
* Conversational context shaping



## Step 3 — Action Normalization

The backend converts natural language into structured actions.

Example:

```json
{
  "action": "add_item",
  "item": "Cheeseburger",
  "quantity": 2,
  "modifiers": ["no onions"]
}
```



## Step 4 — Menu Resolution

The backend resolves menu entities and validates modifiers.



## Step 5 — Deterministic Execution

The backend executes cart mutations using structured cart services.



## Step 6 — Cart Synchronization

The updated cart state is returned to the mobile client.



# Testing

Backend tests use Vitest.

Run:

```bash
cd apps/server
npm run test
```

Or:

```bash
npm run test:run
```

Some existing tests are currently outdated.

For new features or architecture changes, it is recommended to write additional tests as needed.


# Notes

* The backend intentionally separates AI reasoning from application state mutation
* The orchestration pipeline becomes deterministic after normalization and resolution
* Prompt context generation is treated as a first-class backend concern
* Menu resolution and modifier validation are backend-controlled
* The architecture is optimized for maintainability and predictable execution
