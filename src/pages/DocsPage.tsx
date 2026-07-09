import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, Cloud, Terminal, ShieldCheck, Info, BookOpen, Download, Key, Database, Mail, Zap, Cpu, Hash } from 'lucide-react';
export function DocsPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-12">
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-xs">
              <BookOpen className="h-4 w-4" /> AeroMail Technical Guide
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">Developer Documentation</h1>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              Native-grade Progressive Web App architected on Cloudflare's global edge network.
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Zap className="h-6 w-6" /></div>
                <h2 className="text-2xl font-bold tracking-tight">Gmail OAuth2 Integration</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-8 space-y-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">Enable real outbound sending by connecting to Google APIs.</p>
                  <div className="space-y-4">
                    {[
                      "Create a project in Google Cloud Console.",
                      "Enable 'Gmail API' and configure the OAuth Consent Screen.",
                      "Create 'OAuth 2.0 Client ID' (Web Application type).",
                      "Add Authorized Redirect URI: https://your-worker.pages.dev/api/auth/callback"
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium leading-normal">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Key className="h-6 w-6" /></div>
                <h2 className="text-2xl font-bold tracking-tight">Security & Secrets</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-8 space-y-4">
                  <div className="bg-zinc-950 text-zinc-300 p-5 rounded-2xl font-mono text-xs overflow-x-auto border-2 border-zinc-900 shadow-xl">
                    <p className="text-zinc-500 mb-2"># Set required environment secrets</p>
                    <p className="text-primary mb-2">wrangler secret put GMAIL_CLIENT_ID</p>
                    <p className="text-primary mb-2">wrangler secret put GMAIL_CLIENT_SECRET</p>
                    <p className="text-primary mb-2">wrangler secret put REDIRECT_URI</p>
                    <p className="text-primary">wrangler secret put ENCRYPTION_SECRET</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Refresh tokens are stored in Cloudflare KV, encrypted using AES-GCM (256-bit) with your unique <code className="bg-surface-2 px-1 rounded">ENCRYPTION_SECRET</code>.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Cpu className="h-6 w-6" /></div>
              <h2 className="text-2xl font-bold tracking-tight">Database Infrastructure</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
              <CardHeader>
                <CardTitle className="text-lg">Cloudflare D1 Setup</CardTitle>
                <CardDescription>Essential steps for database initialization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-zinc-950 text-zinc-300 p-5 rounded-2xl font-mono text-xs overflow-x-auto border-2 border-zinc-900 shadow-xl">
                  <p className="text-zinc-500 mb-2"># Sync Production Schema</p>
                  <p className="text-primary mb-3">wrangler d1 execute EMAIL_DB --file=./worker/schema.sql --remote</p>
                  <p className="text-zinc-500 mb-2"># Deploy Application</p>
                  <p className="text-primary">bun run deploy</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}