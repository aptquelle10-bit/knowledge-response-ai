# Knowledge Response AI

Transform any content — PDFs, documents, images, spreadsheets — into AI-ready knowledge packages that power chat widgets and bots.

## What's Done

### Core Platform
- **Dashboard** — Overview of all knowledge packages with stats (sources uploaded, facts extracted, ready count)
- **Package Creation** — Create packages by type (Portfolio, Apartments, Company, Product, Support, Legal, Custom) with icon and color
- **Sources Tab** — Upload files via drag-and-drop or file picker. Supports PDF, DOCX, TXT, MD, RTF, HTML, XML, JSON, CSV, PPTX, PNG, JPG, WEBP, GIF, EML, ZIP. Also includes demo files for quick testing
- **Processing Pipeline** — 5-stage pipeline that turns raw sources into structured knowledge:
  1. **Normalization** — Converts every source to Markdown
  2. **Knowledge Intelligence** — Extracts facts, entities, and relationships
  3. **Deduplication** — Unifies duplicate entities (e.g. "Java 8", "JAVA8", "Java SE 8" → "Java 8")
  4. **Master Knowledge Builder** — Generates `master.md`, the single source of truth
  5. **Asset Generation** — Creates facts, entities, canned Q&A, corrections, glossary, intents, metadata, and vector index
- **Knowledge Tab** — View and download all generated assets (master.md, facts.json, entities.json, canned-qa.json, corrections.json, glossary.json, intents.json, metadata.json, vector-index.json, summary.md)
- **Chat Preview Tab** — Test your AI assistant with a full chat interface. Shows the AI Gateway status, provider/model, test connection button, and settings configuration
- **Settings Tab** — Edit package name, description, and delete packages

### Chat Widgets
- **Floating Chat Widget** — A chat bubble (bottom-right corner) visible on every page. Switch between any ready knowledge package from the dropdown. Shows canned Q&A suggestions and handles AI-powered responses
- **Embedded Chat Widget** — Full chat interface inside the Chat Preview tab with message history, token tracking, and source attribution
- **Chat History Persistence** — All messages are saved to the database per package

### AI Gateway
- **Multi-Provider Support** — OpenAI, Google Gemini, Anthropic Claude, and Groq
- **Edge Function** — Serverless AI Gateway at `/functions/v1/ai-gateway` routes requests to your chosen provider
- **Canned Q&A First** — Chat checks pre-generated Q&A before calling the AI (zero tokens, zero latency for common questions)
- **Knowledge-Scoped Responses** — AI responses are grounded in the package's master.md and assets
- **Configurable** — Provider, model, temperature, and max tokens are adjustable in the Gateway Settings modal

### Adding More Knowledge
- Upload new files to an already-processed package anytime
- A banner appears in the Sources tab: "This package is live — upload more files, then click Update Knowledge"
- Click **Update Knowledge** to re-run the full pipeline with all sources (old + new)

---

## How to Use

### Quick Start

1. **Run the project**
   ```
   npm install
   npm run dev
   ```

2. **Create a knowledge package**
   - Click **New Package** on the dashboard
   - Choose a type (e.g. Portfolio, Company, Custom)
   - Give it a name and description

3. **Upload sources**
   - Open the package
   - Go to the **Sources** tab
   - Drag-and-drop files or click **Choose Files**
   - Or use the **Demo Sources** for instant testing (resume.pdf, cover-letter.docx, etc.)

4. **Process the knowledge**
   - Click **Process Knowledge** (top-right button)
   - Watch the 5-stage pipeline run in the **Processing** tab
   - Status changes from "Draft" to "Ready"

5. **Chat with your AI assistant**
   - Click the **Chat Preview** tab inside the package, OR
   - Click the floating chat bubble (bottom-right corner) from any page
   - Ask questions — canned Q&A answers instantly, complex questions go through the AI Gateway

### Adding More Knowledge Later

1. Open an existing (already processed) package
2. Go to the **Sources** tab
3. Upload new files
4. Click **Update Knowledge** (appears next to the source list)
5. The pipeline re-runs with all sources and regenerates everything

---

## How to Connect an AI Provider

The chat widget works in two modes:

### Without an API Key (Demo Mode)
- **Canned Q&A works** — Pre-generated questions get instant, zero-token answers
- **AI responses fail** — Complex questions show an error with instructions on which key to set

### With an API Key (Full Mode)
All AI responses go through the AI Gateway edge function. You need to set a provider API key as an edge function secret.

#### Step 1: Get an API Key

Choose one provider:

| Provider | Key Name | Where to Get It | Notes |
|----------|----------|----------------|-------|
| **Groq** | `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) | Free tier available, fastest |
| **OpenAI** | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Most popular, GPT-4o |
| **Google Gemini** | `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier available |
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | Best for nuanced reasoning |

#### Step 2: Set the Key as an Edge Function Secret

In your Supabase project dashboard:

1. Go to **Edge Functions** → **Secrets**
2. Add a new secret with the key name (e.g. `OPENAI_API_KEY`) and your API key value
3. Save

Or via the Supabase CLI:
```
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

#### Step 3: Select Your Provider in the App

1. Open any package → **Chat Preview** tab
2. Click **Configure** (gear icon in the AI Gateway Hub bar)
3. Select your provider and model
4. Click **Test Connection** to verify it works

Once connected, all chat questions route through your chosen provider with the package's knowledge as context.

---

## How the AI Gateway Works

The chat does not call AI providers directly from the browser. Instead, all AI requests go through a single serverless edge function that acts as a proxy/gateway:

```
Browser chat widget
    │
    ▼  POST /functions/v1/ai-gateway
    │
    ▼  Reads API key from edge function secret
    │
    ├──→ OpenAI API      (if provider = openai)
    ├──→ Groq API        (if provider = groq)
    ├──→ Anthropic API   (if provider = claude)
    └──→ Gemini API      (if provider = gemini)
```

**Two key files:**
- `src/lib/gateway.ts` — Frontend code that builds the request, sends it to the edge function, and handles the response. Also defines the `PROVIDER_INFO` array (provider list, models, key names, docs links) shown in the settings UI.
- `supabase/functions/ai-gateway/index.ts` — The edge function (Deno runtime) that receives the request, reads the provider API key from environment secrets, calls the provider's API, and returns the answer.

**Why a gateway?** Your API keys never touch the browser. The edge function holds them as secrets and proxies requests server-side.

---

## How to Connect a New AI Provider from GitHub

The gateway is designed to be extensible. To add a new AI provider (e.g. Mistral, Cohere, Together AI, or any OpenAI-compatible API), you edit two files:

### Step 1: Add the provider to the edge function

Open `supabase/functions/ai-gateway/index.ts` and make three changes:

**A. Add a default config** in the `PROVIDER_DEFAULTS` object:

```typescript
const PROVIDER_DEFAULTS: Record<string, { model: string; url: string; keyEnv: string }> = {
  // ...existing providers...
  mistral: {
    model: "mistral-large-latest",
    url: "https://api.mistral.ai/v1/chat/completions",
    keyEnv: "MISTRAL_API_KEY",
  },
};
```

**B. Add a call function** (follow the pattern of the existing `callOpenAI` function):

```typescript
async function callMistral(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
```

> **Tip:** Many providers (Groq, Together AI, Anyscale, OpenRouter, Mistral) use the OpenAI-compatible chat completions format. If the new provider follows that format, you can copy `callOpenAI` and just change the URL and error label.

**C. Add the case to the switch statement** in the `serve` handler:

```typescript
switch (provider) {
  case "openai":
    answer = await callOpenAI(messages, model, apiKey, temperature, maxTokens);
    break;
  // ...existing cases...
  case "mistral":
    answer = await callMistral(messages, model, apiKey, temperature, maxTokens);
    break;
  default:
    throw new Error(`Unsupported provider: ${provider}`);
}
```

### Step 2: Add the provider to the frontend

Open `src/lib/gateway.ts` and add an entry to the `PROVIDER_INFO` array:

```typescript
export const PROVIDER_INFO = [
  // ...existing providers...
  {
    id: 'mistral' as AIProvider,
    label: 'Mistral AI',
    description: 'Mistral Large, Mixtral. Open-weight models.',
    models: ['mistral-large-latest', 'mistral-small-latest'],
    keyEnvName: 'MISTRAL_API_KEY',
    docsUrl: 'https://console.mistral.ai/api-keys/',
  },
];
```

Also update the `AIProvider` type:

```typescript
export type AIProvider = 'openai' | 'gemini' | 'claude' | 'groq' | 'mistral';
```

### Step 3: Set the API key as a secret

Same as any other provider — add `MISTRAL_API_KEY` as an edge function secret in your Supabase dashboard.

### Step 4: Deploy the updated edge function

The edge function must be redeployed after editing:

```
supabase functions deploy ai-gateway
```

Or in Bolt, the edge function is redeployed automatically when you save changes to `supabase/functions/ai-gateway/index.ts`.

---

## How to Change a Provider's Model or API Version

Providers frequently release new models or update their API versions. Here's how to update:

### Changing the default model

**In the edge function** (`supabase/functions/ai-gateway/index.ts`), update the `model` field in `PROVIDER_DEFAULTS`:

```typescript
// Before
openai: {
  model: "gpt-4o-mini",
  ...
},

// After — new model released
openai: {
  model: "gpt-5o-mini",
  ...
},
```

**In the frontend** (`src/lib/gateway.ts`), update the `models` array in `PROVIDER_INFO`:

```typescript
{
  id: 'openai',
  models: ['gpt-5o-mini', 'gpt-4o', 'gpt-4o-mini'],  // add new, remove old
  ...
}
```

### Changing the API version (e.g. Anthropic, Gemini)

Some providers require a version header or path segment:

- **Anthropic Claude** — The version is set in the `anthropic-version` header in `callClaude`. To update, change the string:
  ```typescript
  headers: {
    "anthropic-version": "2023-06-01",  // ← change this
  },
  ```

- **Google Gemini** — The API version is in the URL path (`v1beta`). To update:
  ```typescript
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  // Change v1beta → v1 if Google promotes the API
  ```

- **OpenAI / Groq** — These use a stable URL; only the model name changes.

### Changing the Deno std library version

The edge function imports from Deno's standard library. The version is pinned at the top of the file:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

To update to a newer version, change the version number:

```typescript
// Before
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// After
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
```

Check available versions at [deno.land/std](https://deno.land/std). After changing, redeploy the edge function.

### After any change to the edge function

Always redeploy so the changes take effect:

```
supabase functions deploy ai-gateway
```

### After any change to the frontend gateway config

No deployment needed for local dev — just save the file. For production, rebuild the frontend:

```
npm run build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| AI Gateway | Supabase Edge Function (Deno) |
| AI Providers | OpenAI, Gemini, Claude, Groq |
| Real-time | Supabase Realtime (package updates) |

## Project Structure

```
src/
  components/      UI components (chat widgets, tabs, modals)
  views/           Page-level views (Dashboard, PackageDetail)
  lib/             Business logic (engine, gateway, services, types)
supabase/
  functions/       Edge functions (ai-gateway)
  migrations/      Database schema migrations
```

## Database Tables

- `knowledge_packages` — Package metadata (name, slug, type, status, color, icon)
- `knowledge_sources` — Uploaded sources (filename, file type, normalized content, status)
- `knowledge_assets` — Generated knowledge files (master.md, facts.json, etc.)
- `processing_jobs` — Pipeline execution state (stage, progress, log)
- `chat_messages` — Chat history per package (role, content, tokens, provider)

All tables have Row Level Security enabled.
