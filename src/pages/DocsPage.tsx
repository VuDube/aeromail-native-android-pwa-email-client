import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Zap, Key, Database, BookOpen, Link as LinkIcon, Cpu, Terminal, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
export function DocsPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-12">
          <header className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-black tracking-widest uppercase text-xs">
              <BookOpen className="h-4 w-4" /> Technical Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">Production Deployment Guide</h1>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              AeroMail is architected for zero-cost operation on the Cloudflare global network using D1, KV, and Email Routing.
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Database className="h-6 w-6" /></div>
                <h2 className="text-2xl font-black tracking-tight">Step 1: Persistence (D1)</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm font-medium">Create and bind the relational database:</p>
                  <div className="bg-zinc-950 p-5 rounded-2xl font-mono text-xs text-zinc-300 border-2 border-zinc-900 shadow-xl overflow-x-auto">
                    <p className="text-zinc-500 mb-2"># Create the database</p>
                    <p className="text-primary">wrangler d1 create aeromail-db</p>
                    <p className="text-zinc-500 my-2"># Initialize schema</p>
                    <p className="text-primary">wrangler d1 execute aeromail-db --file=worker/schema.sql</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                    <Terminal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 font-medium leading-relaxed">
                      Ensure your <code className="bg-primary/10 px-1 rounded">wrangler.jsonc</code> contains a binding for <code className="font-bold">EMAIL_DB</code>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Key className="h-6 w-6" /></div>
                <h2 className="text-2xl font-black tracking-tight">Step 2: Secrets & KV</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm font-medium">Setup KV for OAuth and secure secrets:</p>
                  <div className="bg-zinc-950 p-5 rounded-2xl font-mono text-xs text-zinc-300 border-2 border-zinc-900 shadow-xl overflow-x-auto">
                    <p className="text-zinc-500 mb-2"># Create KV namespace</p>
                    <p className="text-primary">wrangler kv:namespace create TOKENS</p>
                    <p className="text-zinc-500 my-2"># Set Gmail OAuth secrets</p>
                    <p className="text-primary">wrangler secret put GMAIL_CLIENT_ID</p>
                    <p className="text-primary">wrangler secret put GMAIL_CLIENT_SECRET</p>
                    <p className="text-primary">wrangler secret put ENCRYPTION_SECRET</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><AlertCircle className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black tracking-tight">Troubleshooting Bindings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-destructive/5 border-destructive/20 rounded-m3-xl shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-black text-destructive">Error: D1_ERROR / DATABASE_NOT_FOUND</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 opacity-80">
                  <p>This occurs when the <strong>EMAIL_DB</strong> binding is missing in wrangler.jsonc or the database hasn't been created on the remote environment.</p>
                  <p className="font-bold">Fix: Run Step 1 and redeploy.</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20 rounded-m3-xl shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-black text-amber-600">Error: KV_TYPE_ERROR / TOKENS MISSING</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 opacity-80">
                  <p>The <strong>TOKENS</strong> namespace is required to store encrypted Gmail refresh tokens securely.</p>
                  <p className="font-bold">Fix: Run Step 2 and check your wrangler.jsonc bindings.</p>
                </CardContent>
              </Card>
            </div>
          </section>
          <section className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm"><CheckCircle2 className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black tracking-tight">Gmail API Scopes</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl p-8">
               <p className="text-sm mb-6 opacity-70">AeroMail requires specifically configured scopes in the Google Cloud Console (OAuth Consent Screen):</p>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-surface-variant/10">
                    <span className="font-mono text-xs">https://www.googleapis.com/auth/gmail.send</span>
                    <span className="text-[10px] font-black uppercase text-primary">Required for Outbound</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-surface-variant/10">
                    <span className="font-mono text-xs">https://www.googleapis.com/auth/userinfo.email</span>
                    <span className="text-[10px] font-black uppercase text-primary">Required for Identity</span>
                  </div>
               </div>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}