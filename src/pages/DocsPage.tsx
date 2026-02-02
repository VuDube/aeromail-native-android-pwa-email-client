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
  ChevronRight,
  Download,
  Key,
  Database
} from 'lucide-react';
export function DocsPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <BookOpen className="h-5 w-5" /> AeroMail PWA Guide
          </div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight">Developer Documentation</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl">
            Everything you need to know about installing, deploying, and configuring AeroMail as a native-grade PWA.
          </p>
        </header>
        {/* Section 1: Android PWA Installation */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold">Android PWA Installation</h2>
          </div>
          <Card className="border-none bg-surface-1 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-on-surface-variant">
                AeroMail is designed to function as a native Android application. Follow these steps to install:
              </p>
              <div className="grid gap-3">
                {[
                  "Open Chrome on your Android device.",
                  "Navigate to the AeroMail URL.",
                  "Tap the three-dot menu icon in the top right corner.",
                  "Select 'Install app' or 'Add to Home screen'.",
                  "The 'AeroMail' icon will now appear in your app drawer with native-like behavior (splash screen, no browser UI)."
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 rounded-full h-5 w-5 flex items-center justify-center p-0 shrink-0 border-primary text-primary">
                      {i + 1}
                    </Badge>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">Pro Tip</AlertTitle>
                <AlertDescription className="text-xs">
                  Once installed, AeroMail uses a Service Worker to cache shell assets, providing near-instant load times even on spotty 4G connections.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </section>
        {/* Section 2: Deployment Guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Cloud className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold">Cloudflare Deployment</h2>
          </div>
          <Card className="border-none bg-surface-1 shadow-sm">
            <CardHeader>
              <CardTitle>Zero-Cost Infrastructure</CardTitle>
              <CardDescription>Leveraging Cloudflare Free Tier for edge-based performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2"><Terminal className="h-4 w-4" /> Required Commands</h4>
                <div className="bg-zinc-950 text-zinc-50 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-2">
                  <p># 1. Create D1 Database for Email Indexes</p>
                  <p className="text-primary-foreground/60">wrangler d1 create aeromail-db</p>
                  <p># 2. Create KV Namespace for User Sessions</p>
                  <p className="text-primary-foreground/60">wrangler kv:namespace create aeromail-sessions</p>
                  <p># 3. Create R2 Bucket for Attachments</p>
                  <p className="text-primary-foreground/60">wrangler r2 bucket create aeromail-assets</p>
                  <p># 4. Deploy Application</p>
                  <p className="text-primary-foreground/60">bun run deploy</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant italic">
                Note: In this preview environment, all storage is consolidated into a single Global Durable Object for simulation purposes.
              </p>
            </CardContent>
          </Card>
        </section>
        {/* Section 3: Configuration & Secrets */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Key className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold">Configuration & Gmail OAuth</h2>
          </div>
          <Card className="border-none bg-surface-1 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm">To enable real email sending via Gmail API, you must configure secrets in your Cloudflare dashboard or via CLI:</p>
              <div className="space-y-3">
                <div className="p-3 bg-surface-2 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-mono font-bold">GOOGLE_CLIENT_ID</span>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-mono font-bold">GOOGLE_CLIENT_SECRET</span>
                  <Badge variant="secondary">Required</Badge>
                </div>
              </div>
              <div className="text-xs text-on-surface-variant flex gap-2 items-start">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <span>
                  Configure your OAuth Consent Screen in Google Cloud Console to allow the <code>https://your-app.pages.dev/api/auth/callback</code> redirect URI.
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
        {/* Section 4: Architecture */}
        <section className="space-y-4 pb-20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold">Edge Architecture</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none bg-surface-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Durable Objects</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-on-surface-variant leading-relaxed">
                Acts as a stateful coordination layer for email threads, ensuring consistency across globally distributed worker instances.
              </CardContent>
            </Card>
            <Card className="border-none bg-surface-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Free Tier Limits</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-on-surface-variant leading-relaxed">
                AeroMail fits within the 100k daily requests limit of the Cloudflare Workers free plan, providing zero-cost hosting for personal use.
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}