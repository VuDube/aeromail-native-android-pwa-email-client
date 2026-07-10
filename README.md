# 🚀 AeroMail
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![D1 Database](https://img.shields.io/badge/Storage-Cloudflare_D1-blue?style=for-the-badge)](https://developers.cloudflare.com/d1/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
**AeroMail** is a high-performance, native-like email client Progressive Web App (PWA) architected for the modern web. Built on the Cloudflare global network, it delivers zero-cost infrastructure with a Material Design 3 (Material You) aesthetic.
## 🌟 Overview
AeroMail transforms the standard email experience into a fluid, app-like interface optimized for Android and Desktop. By leveraging Cloudflare's Edge Computing (Workers), Relational Storage (D1), and Email Routing, it provides a secure, private, and extremely fast platform for managing multiple domains.
## 🛠 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Design**: Material Design 3 (Material You) system with dynamic density
- **Backend**: Hono (Web Framework for Workers)
- **Persistence**: Cloudflare D1 (SQL Database)
- **State/Auth**: Cloudflare KV (Token Storage)
- **Inbound**: Cloudflare Email Routing
- **Outbound**: Gmail OAuth2 API Transport
## 🏗 System Architecture
1. **Inbound Path**: External SMTP → Cloudflare Email Routing → Worker Trigger → PostalMime Parser → D1 Database.
2. **Outbound Path**: PWA Compose → Worker → Gmail API (using OAuth2 Refresh Tokens) → Recipient.
3. **Data Flow**: React Query handles frontend caching; Hono manages relational queries against D1 for thread management.
## 🚦 Getting Started
### 1. Infrastructure Setup
You must have the Cloudflare CLI (`wrangler`) installed and authenticated.
```bash
# Create D1 Database
wrangler d1 create aeromail-db
# Create KV Namespace for Auth Tokens
wrangler kv:namespace create TOKENS
# Initialize Database Schema
wrangler d1 execute aeromail-db --file=worker/schema.sql
```
### 2. Environment Variables
Configure these in your `wrangler.jsonc` or as Cloudflare Secrets:
| Variable | Description | Source |
|----------|-------------|--------|
| `GMAIL_CLIENT_ID` | Google Cloud OAuth Client ID | Google Console |
| `GMAIL_CLIENT_SECRET` | Google Cloud OAuth Secret | Google Console |
| `ENCRYPTION_SECRET` | 32-char string for token encryption | Randomly Generated |
| `CF_API_TOKEN` | Cloudflare API Token (Zone Read) | Cloudflare Dashboard |
### 3. Gmail OAuth2 Configuration
- Enable **Gmail API** in Google Cloud Console.
- Set Authorized Redirect URI: `https://<your-worker-subdomain>.workers.dev/api/auth/callback`.
- Scopes required: `gmail.send`, `userinfo.email`, `openid`.
## 📦 Deployment
```bash
# Install dependencies
bun install
# Build & Deploy
bun run deploy
```
## 🗺 Roadmap & Status
- [x] Material Design 3 UI Shell
- [x] D1 Relational Persistence
- [x] Multi-recipient Compose
- [x] Gmail API Integration
- [ ] IMAP/POP3 Support (Phase 12)
- [ ] PGP Encryption (Phase 13)
## 📄 License
MIT © 2025 AeroMail Project.