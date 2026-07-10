import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Zap, Key, Database, BookOpen, Link as LinkIcon, Cpu, Terminal, ArrowRight } from 'lucide-react';
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
                    <p className="text-zinc-500 my-2"># Initialize schema (using worker/schema.sql)</p>
                    <p className="text-primary">wrangler d1 execute aeromail-db --file=worker/schema.sql</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                    <Terminal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 font-medium leading-relaxed">
                      Ensure your <code className="bg-primary/10 px-1 rounded">wrangler.jsonc</code> contains a binding for <code className="font-bold">EMAIL_DB</code> pointing to the UUID generated above.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Key className="h-6 w-6" /></div>
                <h2 className="text-2xl font-black tracking-tight">Step 2: Secrets & Tokens</h2>
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
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Zap className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black tracking-tight">Step 3: Gmail Transport</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">1</span>
                  <p className="font-bold">Google Console</p>
                  <p className="text-xs text-muted-foreground">Enable Gmail API and create OAuth Client ID (Web Application).</p>
                </div>
                <div className="space-y-2">
                  <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">2</span>
                  <p className="font-bold">Callback URI</p>
                  <p className="text-xs text-muted-foreground truncate">https://your-domain.com/api/auth/callback</p>
                </div>
                <div className="space-y-2">
                  <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">3</span>
                  <p className="font-bold">Permissions</p>
                  <p className="text-xs text-muted-foreground">Ensure 'gmail.send' and 'userinfo.email' scopes are requested.</p>
                </div>
              </div>
            </Card>
          </section>
          <section className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Cpu className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black tracking-tight">System Data Flow</h2>
            </div>
            <div className="relative p-10 bg-surface-1 rounded-m3-xl border border-surface-variant/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center">
                <div className="space-y-4">
                  <div className="p-6 bg-surface-2 rounded-2xl border-2 border-primary/20 flex flex-col items-center">
                    <Globe className="h-10 w-10 text-primary mb-2" />
                    <span className="font-black text-sm">SMTP Inbound</span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">CF Email Routing</p>
                </div>
                <div className="flex justify-center"><ArrowRight className="h-8 w-8 text-primary/30 hidden md:block" /></div>
                <div className="space-y-4">
                  <div className="p-6 bg-surface-2 rounded-2xl border-2 border-primary/20 flex flex-col items-center">
                    <Database className="h-10 w-10 text-primary mb-2" />
                    <span className="font-black text-sm">Local Cache</span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Cloudflare D1</p>
                </div>
                <div className="flex justify-center"><ArrowRight className="h-8 w-8 text-primary/30 hidden md:block" /></div>
                <div className="space-y-4">
                  <div className="p-6 bg-surface-2 rounded-2xl border-2 border-primary/20 flex flex-col items-center">
                    <LinkIcon className="h-10 w-10 text-primary mb-2" />
                    <span className="font-black text-sm">Transport</span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Gmail API</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
import { Globe } from 'lucide-react';