import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wand2
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
            <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">Developer Documentation</h1>
            <p className="text-xl text-on-surface-variant max-w-3xl leading-relaxed">
              Native-grade Progressive Web App architected on Cloudflare's global edge network.
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Section 1: PWA */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Android PWA Integration</h2>
              </div>
              <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl overflow-hidden">
                <CardContent className="pt-8 space-y-6">
                  <div className="space-y-4">
                    {[
                      "Navigate to AeroMail in Chrome for Android.",
                      "Open the browser menu (⋮) and select 'Install App'.",
                      "The Service Worker will cache the UI shell instantly.",
                      "Launch from your Home Screen for full-screen immersive mode."
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium leading-normal">{step}</span>
                      </div>
                    ))}
                  </div>
                  <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold mb-1 uppercase text-[10px] tracking-widest">Performance Note</AlertTitle>
                    <AlertDescription className="text-xs text-on-surface-variant">
                      AeroMail targets sub-100ms LCP by utilizing Stale-While-Revalidate caching for all static assets via its built-in Service Worker.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </section>
            {/* Section 2: Deployment */}
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
                </CardContent>
              </Card>
            </section>
          </div>
          {/* Section 3: Inbound Simulation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Wand2 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Real-time Simulation Engine</h2>
            </div>
            <Card className="border-none bg-surface-1 shadow-sm rounded-m3-xl">
              <CardContent className="pt-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Relational Logic</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    AeroMail implements a D1-backed simulation engine. When you trigger an inbound simulation, the backend:
                  </p>
                  <ul className="text-xs space-y-2 list-disc pl-4 text-on-surface-variant">
                    <li>Generates a random UUID for the message and thread.</li>
                    <li>Selects a sender from a diverse pool of mock services (GitHub, Stripe, etc).</li>
                    <li>Calculates thread metadata (unread counts, snippets, timestamps).</li>
                    <li>Synchronizes the update across the edge in real-time.</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> API Endpoint</h3>
                  <div className="bg-surface-2 p-4 rounded-xl border border-surface-variant/20">
                    <code className="text-xs font-bold text-primary">POST /api/simulate/inbound</code>
                    <p className="text-[10px] mt-2 text-on-surface-variant italic">
                      Used in the Settings view to test your Inbox live without external SMTP configuration.
                    </p>
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