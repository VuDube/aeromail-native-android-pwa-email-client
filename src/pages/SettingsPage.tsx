import React, { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTheme } from '@/hooks/use-theme';
import { useDensity } from '@/hooks/use-density';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { DomainInfo } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Layout,
  ShieldCheck,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Loader2,
  Globe,
  Bug,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status')
  });
  const { data: authStatus, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => api<{ connected: boolean }>('/api/auth/status')
  });
  const { data: domains, isLoading: isDomainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api<DomainInfo[]>('/api/domains')
  });
  const toggleDomain = useMutation({
    mutationFn: (vars: { id: string, name: string, enabled: boolean }) => 
      api('/api/domains/toggle', { 
        method: 'POST', 
        body: JSON.stringify({ domainId: vars.id, domainName: vars.name, enabled: vars.enabled }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success("Identity updated");
    },
    onError: (e: any) => toast.error(e.message)
  });
  const disconnectMutation = useMutation({
    mutationFn: () => api('/api/auth/disconnect', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Gmail disconnected");
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    }
  });
  const simulateMutation = useMutation({
    mutationFn: () => api('/api/simulate/inbound', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Simulation email arrived");
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: (err: any) => toast.error(err.message || "Simulation failed")
  });
  useEffect(() => {
    if (searchParams.get('auth') === 'success') {
      toast.success("Google Account linked!");
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      // Remove the param without full reload
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('auth');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, queryClient, setSearchParams]);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="space-y-1">
            <h1 className="text-4xl font-black text-foreground tracking-tighter">Settings</h1>
            <p className="text-muted-foreground font-medium">Configure your edge mail experience</p>
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            {/* Simulation Block */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Bug className="h-4 w-4" /> Lab Tools
              </div>
              <Card className="rounded-m3-xl border-none bg-primary/5 shadow-sm border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" /> Test Inbound Flow
                  </CardTitle>
                  <CardDescription>Bypass real SMTP to test the D1 thread grouping logic.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => simulateMutation.mutate()} 
                    disabled={simulateMutation.isPending}
                    className="w-full rounded-full bg-primary text-white font-bold h-12 shadow-lg shadow-primary/20 gap-3"
                  >
                    {simulateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                    Inject Mock Message
                  </Button>
                </CardContent>
              </Card>
            </section>
            {/* Cloudflare Identities Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                  <ShieldCheck className="h-4 w-4" /> Domain Identities
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchDomains()} className="h-8 gap-2 font-bold text-xs opacity-60 hover:opacity-100">
                  <RefreshCw className={cn("h-3 w-3", isDomainsLoading && "animate-spin")} /> Reload
                </Button>
              </div>
              <Card className="rounded-m3-xl border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Relational Identities</CardTitle>
                  <CardDescription>Managed Cloudflare domains tracked in your D1 instance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isDomainsLoading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
                  ) : !domains || domains.length === 0 ? (
                    <div className="p-8 bg-surface-2 rounded-2xl border-2 border-dashed border-surface-variant/20 text-center space-y-4">
                      <Globe className="h-10 w-10 mx-auto text-surface-on-variant/20" />
                      <div className="space-y-1">
                        <p className="font-bold">No Records Found</p>
                        <p className="text-sm text-surface-on-variant">Check your D1 binding or seed data.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-variant/10">
                      {domains.map(d => (
                        <div key={d.id} className="py-4 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-surface-2 flex items-center justify-center text-surface-on-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <Globe className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{d.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] font-black uppercase px-2 py-0 border-none bg-surface-3">
                                  {d.status}
                                </Badge>
                                {d.isRoutingEnabled && (
                                  <Badge className="bg-green-500/10 text-green-600 text-[10px] font-black uppercase px-2 py-0 border-none">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch 
                            checked={d.localEnabled} 
                            disabled={toggleDomain.isPending}
                            onCheckedChange={(val) => toggleDomain.mutate({ id: d.id, name: d.name, enabled: val })} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            {/* Gmail API Integration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Zap className="h-4 w-4" /> Outbound Delivery
              </div>
              <Card className="rounded-m3-xl border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Gmail Relay
                    {authStatus?.connected && <Badge className="bg-green-500/10 text-green-600 text-[10px] font-black uppercase">Linked</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-5 bg-surface-2 rounded-2xl border border-surface-variant/10">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-all", authStatus?.connected ? "bg-green-500/10 text-green-600" : "bg-surface-3 text-surface-on-variant/40")}>
                        {authStatus?.connected ? <CheckCircle2 className="h-6 w-6" /> : <LinkIcon className="h-6 w-6" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{authStatus?.connected ? "Identity Linked" : "No Identity Linked"}</p>
                        <p className="text-xs text-surface-on-variant opacity-60">Authorize AeroMail to send mail</p>
                      </div>
                    </div>
                    {isAuthLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : authStatus?.connected ? (
                      <Button 
                        variant="ghost" 
                        onClick={() => disconnectMutation.mutate()} 
                        disabled={disconnectMutation.isPending}
                        className="rounded-full text-destructive font-bold hover:bg-destructive/10"
                      >
                        <Unlink className="h-4 w-4 mr-2" /> Revoke
                      </Button>
                    ) : (
                      <Button asChild className="rounded-full bg-primary text-white font-bold h-11 px-8 shadow-lg shadow-primary/20"><a href="/api/auth/login">Connect</a></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
            {/* Appearance Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Layout className="h-4 w-4" /> Personalization
              </div>
              <Card className="rounded-m3-xl border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardContent className="p-0 divide-y divide-surface-variant/10">
                  <div className="flex items-center justify-between p-6">
                    <Label className="text-base font-bold text-surface-on cursor-pointer" htmlFor="dark-mode">Night Mode</Label>
                    <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                  <div className="flex items-center justify-between p-6">
                    <Label className="text-base font-bold text-surface-on">UI Density</Label>
                    <ToggleGroup type="single" value={density} onValueChange={(val) => val && setDensity(val as any)} className="bg-surface-2 p-1 rounded-full">
                      <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Relaxed</ToggleGroupItem>
                      <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Dense</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}