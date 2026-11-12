# Vendor Onboarding Automation Platform

> **Hybrid Deterministic + AI Vendor KYC Gateway built with Next.js 16 (App Router), Upstash Redis, NVIDIA NIM, Resend, and Server-Sent Events (SSE).**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis%20REST-00e9a3?style=flat-square&logo=redis)](https://upstash.com/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM%20AI-76b900?style=flat-square&logo=nvidia)](https://build.nvidia.com/)
[![Resend](https://img.shields.io/badge/Resend-Transactional%20Email-000000?style=flat-square&logo=resend)](https://resend.com/)

---

## 📖 Complete Technical Architecture & Specification

For an exhaustive, production-grade technical breakdown—including the underlying **mathematical formulation of Sørensen–Dice's Coefficient**, **statutory Indian GSTIN regex decomposition**, **NVIDIA NIM prompt architecture**, and **system sequence diagrams**—please read:

👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)** 👈

---

## ⚡ Quick Overview

This platform automates vendor Know Your Customer (KYC) onboarding for enterprise procurement and Accounts Payable (AP) teams.

Instead of naively sending every vendor application to expensive LLMs, the platform utilizes a **4-stage Cost-Efficiency Waterfall**:

1. **Step A: Deterministic Regex Validation** — Instant verification of statutory 15-character Indian GSTINs and required fields in $< 5\text{ ms}$ at 0 token cost.
2. **Step B: Mathematical String Similarity** — Sørensen–Dice bigram coefficient with corporate suffix normalization. $\ge 90\%$ similarity auto-approves instantly in $< 1\text{ ms}$, bypassing LLM and email steps.
3. **Step C: NVIDIA NIM AI Inference** — Triggered only on ambiguous trade/DBA variations ($< 90\%$) to evaluate acronym plausibility (e.g. *Global Freight Solutions* $\to$ *GFS*).
4. **Step D: Automated Feedback Loop** — Dispatches actionable notification emails via Resend or queues drafts for human compliance sign-off.

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and add your credentials:

```bash
cp .env.example .env.local
```

Required keys:
```env
UPSTASH_REDIS_REST_URL="https://your-upstash-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
NVIDIA_API_KEY="nvapi-your-nvidia-key"
RESEND_API_KEY="re_your_resend_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Run Locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the interactive dashboard.

### 3. Build & Deploy

- **Next.js Production Build**: `npm run build && npm run start`
- **Cloudflare Workers Deployment**: `npm run build:worker && npm run deploy:worker`
- **Vercel Deployment**: `npx vercel --prod`
