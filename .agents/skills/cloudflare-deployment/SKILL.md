---
name: cloudflare-deployment
description: Use when building, configuring, testing, or deploying applications to Cloudflare (Cloudflare Workers, Cloudflare Pages, OpenNext for Next.js, or Wrangler CLI), binding KV/D1/R2 storage, or troubleshooting Cloudflare runtime errors.
---

# Cloudflare Deployment & Architecture Skill

Comprehensive guide for deploying full-stack web applications, static sites, APIs, and background jobs to Cloudflare's global edge network.

---

## 1. Quick Decision Matrix: Workers vs. Pages vs. OpenNext

| Deployment Target | Best For | Architecture & Engine | Next.js Support | Command |
|---|---|---|---|---|
| **Cloudflare Workers (via OpenNext)** | Modern Next.js (App Router, Route Handlers, SSR, Server Actions) | `workerd` runtime + `@opennextjs/cloudflare` adapter | **Full Support** (Node.js runtime compatibility) | `npx wrangler deploy` |
| **Cloudflare Pages** | Static Sites, Single Page Apps (React, Vite, HTML/CSS), JAMstack | Global CDN edge caching of pre-built static assets | Static Export only (`output: 'export'`) | `npx wrangler pages deploy ./dist` |
| **Cloudflare Workers (Standalone)** | Lightweight REST APIs, Webhooks, Proxies, Cron Triggers, Microservices | Pure JavaScript/TypeScript edge functions | N/A (Standard Fetch API handler) | `npx wrangler deploy` |

> [!IMPORTANT]
> **Modern Next.js on Cloudflare**: Cloudflare has officially partnered with the OpenNext project. For modern Next.js 14, 15, and 16, **always use `@opennextjs/cloudflare` targeting Cloudflare Workers**. The older `@cloudflare/next-on-pages` adapter is legacy and restricted to the Edge runtime.

---

## 2. Deploying Next.js to Cloudflare (The Modern OpenNext Standard)

### Step 1: Install Required Dependencies
```bash
# Install the OpenNext Cloudflare adapter
npm install @opennextjs/cloudflare@latest

# Install Wrangler CLI as a dev dependency
npm install --save-dev wrangler@latest
```

### Step 2: Configure `wrangler.jsonc` (or `wrangler.toml`)
Create `wrangler.jsonc` in the root of your project:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-next-app",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```
*Note: `"nodejs_compat"` is mandatory because Next.js utilizes Node APIs provided by Cloudflare's built-in Node compatibility layer.*

### Step 3: Add Build & Deploy Scripts in `package.json`
```json
"scripts": {
  "build:worker": "cloudflare",
  "dev:worker": "wrangler dev --port 8771",
  "preview:worker": "npm run build:worker && npm run dev:worker",
  "deploy:worker": "npm run build:worker && wrangler deploy"
}
```

### Step 4: Local Preview (Testing in Cloudflare's `workerd` runtime)
```bash
npm run preview:worker
```
This tests your built app inside Cloudflare's local edge sandbox (`http://localhost:8771`), catching any runtime or edge-incompatible APIs before shipping to production.

### Step 5: Deploy Live to Cloudflare
```bash
npm run deploy:worker
```

---

## 3. Deploying Static Sites (Cloudflare Pages)

If the project is a purely static site (e.g. Vite, Astro, or Next.js with `output: 'export'`):

1. **Build Static Assets**:
   ```bash
   npm run build
   # Outputs static files to ./out (Next.js) or ./dist (Vite/React)
   ```

2. **Deploy to Cloudflare Pages**:
   ```bash
   npx wrangler pages deploy ./out --project-name=my-static-site
   ```

3. **Subsequent Deploys**:
   Wrangler will output a unique preview deployment URL and promote to production if deployed on the main branch.

---

## 4. Wrangler CLI Cheatsheet & Operational Workflows

### Authentication
```bash
# Login via browser OAuth
npx wrangler login

# Check currently authenticated account and email
npx wrangler whoami

# Logout
npx wrangler logout
```

### Environment Variables & Production Secrets
Never commit `.env` with production keys to Git. Manage secrets securely on Cloudflare:

```bash
# Upload a secret (e.g., API keys, database credentials)
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN

# List names of defined secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete OLD_KEY
```

For non-sensitive public environment variables, define them under `"vars"` in `wrangler.jsonc`:
```jsonc
"vars": {
  "NEXT_PUBLIC_APP_ENV": "production",
  "NEXT_PUBLIC_SITE_NAME": "Vendor Portal"
}
```

---

## 5. Binding Cloudflare Edge Storage (D1, KV, R2)

Cloudflare Workers can bind directly to global serverless databases and storage buckets without needing separate connection strings:

### 1. Cloudflare D1 (Serverless SQL Database)
```bash
# Create a D1 database
npx wrangler d1 create my-db

# Bind inside wrangler.jsonc:
# "d1_databases": [{ "binding": "DB", "database_name": "my-db", "database_id": "xxx" }]

# Execute SQL query:
npx wrangler d1 execute my-db --command "SELECT * FROM users;"
```

### 2. Cloudflare KV (Low-Latency Key-Value Store)
```bash
# Create a KV namespace
npx wrangler kv:namespace create "CACHE_KV"

# Bind inside wrangler.jsonc:
# "kv_namespaces": [{ "binding": "CACHE_KV", "id": "xxx" }]
```

### 3. Cloudflare R2 (S3-Compatible Object Storage, Zero Egress Fees)
```bash
# Create an R2 bucket
npx wrangler r2 bucket create my-bucket

# Bind inside wrangler.jsonc:
# "r2_buckets": [{ "binding": "MY_BUCKET", "bucket_name": "my-bucket" }]
```

---

## 6. Critical Cloudflare Pitfalls & Solutions

### 1. Incompatible Node.js APIs
* **Symptom**: `Error: Dynamic require of "crypto" is not supported` or `Buffer is not defined`.
* **Fix**: Ensure `"nodejs_compat"` flag is included in `wrangler.jsonc` `compatibility_flags`. Use Web standard APIs (`crypto.randomUUID()`, `fetch`, `Headers`, `Request`, `Response`) wherever possible.

### 2. Ephemeral / Read-Only Filesystem
* **Symptom**: `EROFS: read-only file system, open 'database.json'`.
* **Fix**: Edge Workers do not have persistent local disks. Use serverless stores like **Upstash Redis**, Cloudflare **KV**, **D1**, or **R2** for persistence.

### 3. Streaming Server-Sent Events (SSE)
* **Symptom**: Stream chunks buffered and dumped all at once instead of streaming in real-time.
* **Fix**:
  - Set header `'X-Accel-Buffering': 'no'`.
  - Use Web Standard `ReadableStream` with `TextEncoder`.
  - Send periodic keep-alive pings (`: keepalive\n\n`) every 15s to keep the edge connection open.

---

## 7. Official Documentation Reference & Sitemap

* **Cloudflare Workers Official Docs**: [https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)
* **Cloudflare Pages Official Docs**: [https://developers.cloudflare.com/pages/](https://developers.cloudflare.com/pages/)
* **OpenNext for Cloudflare**: [https://opennext.js.org/cloudflare](https://opennext.js.org/cloudflare)
* **Wrangler CLI Reference**: [https://developers.cloudflare.com/workers/wrangler/commands/](https://developers.cloudflare.com/workers/wrangler/commands/)
* **Cloudflare Runtime APIs & Bindings**: [https://developers.cloudflare.com/workers/runtime-apis/](https://developers.cloudflare.com/workers/runtime-apis/)
* **Node.js Compatibility in Cloudflare Workers**: [https://developers.cloudflare.com/workers/runtime-apis/nodejs/](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

