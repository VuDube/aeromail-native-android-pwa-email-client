import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Zap, Key, Database, BookOpen, Link as LinkIcon, Cpu } from 'lucide-react';
export function DocsPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-12">
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-black tracking-widest uppercase text-xs">
              <BookOpen className="h-4 w-4" /> Technical Reference
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">Outbound Architecture</h1>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              AeroMail uses Cloudflare's Edge network to securely bridge D1 relational storage with the Gmail API.
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Zap className="h-6 w-6" /></div>
                <h2 className="text-2xl font-bold tracking-tight">Gmail OAuth2 Setup</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Google Cloud Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="space-y-4">
                    {[
                      "Create a project in Google Cloud Console.",
                      "Enable 'Gmail API' and configure the OAuth Consent Screen (Internal or External).",
                      "Create 'OAuth 2.0 Client ID' (Type: Web Application).",
                      "Add Authorized Redirect URI: https://<your-worker>.workers.dev/api/auth/callback"
                    ].map((step, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
                <h2 className="text-2xl font-bold tracking-tight">Security & Secrets</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-zinc-950 p-5 rounded-2xl font-mono text-xs overflow-x-auto border-2 border-zinc-900 shadow-xl">
                    <p className="text-zinc-500 mb-2"># Deploy secrets to Cloudflare</p>
                    <p className="text-primary">wrangler secret put GMAIL_CLIENT_ID</p>
                    <p className="text-primary">wrangler secret put GMAIL_CLIENT_SECRET</p>
                    <p className="text-primary">wrangler secret put REDIRECT_URI</p>
                    <p className="text-primary">wrangler secret put ENCRYPTION_SECRET</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <Key className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-xs text-primary/80 font-medium leading-relaxed">
                      Refresh tokens are encrypted using AES-GCM (256-bit) before storage in Cloudflare KV. The <code className="bg-primary/10 px-1 rounded">ENCRYPTION_SECRET</code> is used to derive the key material at runtime.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Cpu className="h-6 w-6" /></div>
              <h2 className="text-2xl font-bold tracking-tight">Data Integrity</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AeroMail maintains a "Distributed Source of Truth" pattern. All messages are persisted in Cloudflare D1 for instant local access, while outbound delivery is delegated to Gmail's global infrastructure.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-surface-2 rounded-2xl border border-surface-variant/10 flex flex-col gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Persistence</span>
                    <span className="text-sm font-bold">Cloudflare D1</span>
                  </div>
                  <div className="p-4 bg-surface-2 rounded-2xl border border-surface-variant/10 flex flex-col gap-2">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Transport</span>
                    <span className="text-sm font-bold">Gmail API</span>
                  </div>
                  <div className="p-4 bg-surface-2 rounded-2xl border border-surface-variant/10 flex flex-col gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Storage</span>
                    <span className="text-sm font-bold">Cloudflare KV</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}