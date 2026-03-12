# Erza Studio

Erza Studio is an AI-powered writing platform built with Next.js. It provides a suite of intelligent writing tools including an article editor, AI chat, text humanizer, paraphraser, AI content detector, and more — all within a clean, multilingual interface.

## Features

- **Article Editor** — Rich text editor powered by Tiptap with support for tables, images, links, and text alignment
- **AI Chat** — Conversational AI assistant with chat history and real-time streaming
- **AI Tools** — Collection of AI-powered writing utilities
- **Humanizer** — Transform AI-generated text into natural-sounding human writing
- **Paraphraser** — Intelligently rephrase content while preserving meaning
- **AI Detector** — Detect AI-generated content
- **Writing Assistant** — In-editor AI writing support
- **Collections** — Organize and manage articles and documents
- **Dashboard** — Overview of usage and activity
- **Notifications** — In-app notification system
- **Account Management** — Profile, security (2FA/TOTP), active sessions, appearance, and billing

## Tech Stack

| Category             | Technology                                                            |
| -------------------- | --------------------------------------------------------------------- |
| Framework            | [Next.js 16](https://nextjs.org) (App Router)                         |
| Language             | TypeScript                                                            |
| Styling              | Tailwind CSS v4                                                       |
| Rich Text Editor     | [Tiptap](https://tiptap.dev)                                          |
| State Management     | [Zustand](https://zustand-demo.pmnd.rs)                               |
| Forms                | [React Hook Form](https://react-hook-form.com)                        |
| Animations           | [Framer Motion](https://www.framer.com/motion)                        |
| Internationalization | [next-intl](https://next-intl-docs.vercel.app) (English & Indonesian) |
| Charts               | [Recharts](https://recharts.org)                                      |
| HTTP Client          | Axios                                                                 |
| Containerization     | Docker                                                                |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (recommended)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── [locale]/         # Locale-aware routes (en, id)
│   │   ├── (app)/        # Authenticated app routes
│   │   │   ├── ai-chat/
│   │   │   ├── ai-tools/
│   │   │   ├── article/
│   │   │   ├── collection/
│   │   │   ├── dashboard/
│   │   │   ├── security/
│   │   │   └── ...
│   │   ├── (auth)/       # Authentication routes
│   │   └── (landing)/    # Public landing pages
│   └── api/              # API route handlers
├── components/           # Reusable UI components
│   ├── auth/
│   ├── chat/
│   ├── features/
│   ├── landing/
│   ├── layouts/
│   └── ui/
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── messages/             # i18n translation files (en.json, id.json)
├── stores/               # Zustand state stores
└── types/                # Shared TypeScript types
```

## Internationalization

The app supports **English** (`en`) and **Indonesian** (`id`), with Indonesian as the default locale. All routes are prefixed with the locale (e.g. `/id/dashboard`, `/en/dashboard`).

## Environment Variables

| Variable              | Description                  |
| --------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL for the backend API |

## Docker

Build and run with Docker:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.erza.ai \
  --build-arg NODE_ENV=production \
  -t erza-studio .

docker run -p 3000:3000 erza-studio
```

## API

All `/api/*` requests are proxied to the backend at `https://api.dev.erza.ai`. OAuth routes are handled server-side via Next.js API routes to correctly manage `Set-Cookie` headers.
