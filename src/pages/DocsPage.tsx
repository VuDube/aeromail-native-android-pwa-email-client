import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Smartphone,
  Cloud,
  Terminal,
  ShieldCheck,
  Info,
  BookOpen,
  Download,
  Key,
  Database,
  Wand2,
  Mail,
  Zap
} from 'lucide-react';
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
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Native Inbound Routing</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-8 space-y-6">
                  <p className="text-sm text-muted-foreground">
                    AeroMail uses Cloudflare Email Routing to receive mail directly in the Worker without an IMAP server.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Verified your domain in Cloudflare Dashboard.",
                      "Go to Email -> Email Routing -> Destination Addresses.",
                      "Add your Worker as a destination for specific addresses.",
                      "Ensure 'EMAIL_DB' (D1) is bound to your production worker."
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
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Zap className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Deterministic Threading</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Grouping Algorithm</CardTitle>
                  <CardDescription>How we group messages without headers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-xl text-xs font-mono">
                    hash = SHA-256(normalize(subject) + sender_email)
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By normalizing the subject (removing "Re:" and "Fwd:") and combining it with the sender's identity, we create a stable identifier that groups conversations even across multiple routing events.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Cloud className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Cloudflare Infrastructure</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
              <CardHeader>
                <CardTitle className="text-lg">Edge Deployment Guide</CardTitle>
                <CardDescription>Console commands for zero-cost hosting setup.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-zinc-950 text-zinc-300 p-5 rounded-2xl font-mono text-xs overflow-x-auto border-2 border-zinc-900 shadow-xl">
                  <p className="text-zinc-500 mb-2"># Create D1 Storage</p>
                  <p className="text-primary mb-3">wrangler d1 create aeromail-db</p>
                  <p className="text-zinc-500 mb-2"># Init DB Schema</p>
                  <p className="text-primary mb-3">wrangler d1 execute aeromail-db --file=./worker/schema.sql</p>
                  <p className="text-zinc-500 mb-2"># Deploy Worker</p>
                  <p className="text-primary">bun run deploy</p>
                </div>
                <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary font-bold mb-1 uppercase text-[10px] tracking-widest">Wrangler Config</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground">
                    Ensure your <code className="bg-primary/10 px-1 rounded">wrangler.jsonc</code> includes the D1 binding name <code className="font-bold">EMAIL_DB</code> to match the application's internal client.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}