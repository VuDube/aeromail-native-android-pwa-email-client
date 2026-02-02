# Cloudflare Workers Full-Stack Template

[cloudflarebutton]

A production-ready starter template for building full-stack applications with Cloudflare Workers. Features a serverless backend powered by Durable Objects for multi-tenant entity storage, a modern React frontend with TanStack Query, Shadcn/UI components, TailwindCSS, and TypeScript end-to-end.

This template includes a demo chat application with users, chat boards, and real-time messaging, showcasing entity management, indexed listings, CRUD operations, and seamless integration between frontend and backend.

## ✨ Key Features

- **Durable Objects Backend**: Global storage for multiple entities (Users, Chats) with automatic indexing, pagination, and optimistic concurrency control.
- **Type-Safe API**: Shared types between frontend and backend using Hono routing.
- **Modern React Frontend**: TanStack Query for data fetching/mutations, React Router, error boundaries, and theme support.
- **UI Components**: Pre-configured Shadcn/UI with TailwindCSS, dark mode, and animations.
- **Development Workflow**: Hot-reload for frontend, Wrangler for backend, Bun for fast package management.
- **Production-Ready**: CORS, logging, health checks, client error reporting, and SPA asset handling.
- **Seed Data**: Mock users/chats/messages auto-populated on first run.
- **PWA-Ready**: Responsive design with mobile support.

## 🛠️ Tech Stack

- **Backend**: Cloudflare Workers, Durable Objects, Hono, TypeScript
- **Frontend**: React 18, Vite, TanStack Query, React Router, Zod, Framer Motion
- **UI**: Shadcn/UI, TailwindCSS, Lucide Icons, Sonner (toasts)
- **Tools**: Bun, Wrangler, ESLint, TypeScript 5
- **Data**: Indexed entities with prefix-based cursors and CAS for concurrency

## 🚀 Quick Start

1. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd <project-name>
   bun install
   ```

2. **Run Development Server**:
   ```bash
   bun dev
   ```
   - Frontend: http://localhost:3000
   - API: Proxied through Workers (via Wrangler dev integration)

3. **Type Generation** (for Workers bindings):
   ```bash
   bun cf-typegen
   ```

## 💻 Development

- **Frontend Hot-Reload**: `bun dev` serves Vite dev server.
- **Backend Routes**: Edit `worker/user-routes.ts` to add endpoints. Core utils in `worker/core-utils.ts` and entities in `worker/entities.ts`.
- **New Entities**: Extend `IndexedEntity` in `worker/entities.ts` for indexed lists/deletes.
- **Frontend Data Fetching**: Use `api()` helper from `@/lib/api-client.ts` (auto-typed via shared types).
- **Linting**:
  ```bash
  bun lint
  ```
- **Preview Build**:
  ```bash
  bun build
  bun preview
  ```

### API Examples

All endpoints return `{ success: true, data: ... }` or `{ success: false, error: '...' }`.

- `GET /api/users` - List users (supports `?cursor` & `?limit`)
- `POST /api/users` - `{ name: "Alice" }`
- `GET /api/chats/:id/messages`
- `POST /api/chats/:id/messages` - `{ userId: "...", text: "Hello" }`

Full OpenAPI docs available at `/api/docs` (if enabled).

## ☁️ Deployment

Deploy to Cloudflare Workers in one command:

```bash
bun run deploy
```

This builds the frontend assets, bundles the Worker, and deploys via Wrangler.

[cloudflarebutton]

### Custom Domain & Assets

- Assets served as SPA (single-page application).
- API routes: `/api/*` handled by Worker first.
- Configure `wrangler.jsonc` for bindings/migrations.

### Environment Variables

Set via Wrangler dashboard or `wrangler.toml`:
```
[env.production.vars]
CUSTOM_VAR = "value"
```

## 📚 Project Structure

```
├── shared/          # Shared types & mock data
├── src/             # React frontend
├── worker/          # Cloudflare Worker backend
├── tailwind.config.js # UI theming
├── wrangler.jsonc   # Deployment config
└── package.json     # Bun scripts
```

## 🤝 Contributing

1. Fork & clone.
2. Install: `bun install`.
3. Create feature branch: `git checkout -b feature/my-feature`.
4. Commit: `git commit -m "Add my feature"`.
5. Push & PR.

## 🔒 License

MIT License. See [LICENSE](LICENSE) for details.

## 🙌 Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Star this repo! ⭐