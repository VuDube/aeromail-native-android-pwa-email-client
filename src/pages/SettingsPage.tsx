import React from 'react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, Globe, Bug, Terminal, Zap, AlertTriangle, Database, Server, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const isProd = window.location.hostname !== 'localhost';
  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status')
  });
  const { data: domains, isLoading: isDomainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api<DomainInfo[]>('/api/domains'),
    enabled: !!status?.db_ready
  });
  const toggleDomain = useMutation({
    mutationFn: (vars: { id: string, name: string, enabled: boolean }) =>
      api('/api/domains/toggle', {
        method: 'POST',
        body: JSON.stringify({ domainId: vars.id, domainName: vars.name, enabled: vars.enabled })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success("Domain routing updated");
    },
    onError: (err: any) => toast.error(err.message)
  });
  const simulateMutation = useMutation({
    mutationFn: () => api('/api/simulate/inbound', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Simulation email arrived");
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: (err: any) => toast.error(err.message)
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
            <p className="text-muted-foreground font-medium">AeroMail Infrastructure Management</p>
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            {/* System Readiness Block */}
            <section className="space-y-4">
               <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Server className="h-4 w-4" /> System Health
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-surface-1 border-surface-variant/10">
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">D1 Database</p>
                   {status?.db_ready ? <Badge className="bg-green-500/10 text-green-600 border-none">Active</Badge> : <Badge variant="destructive">Missing</Badge>}
                </Card>
                <Card className="p-4 bg-surface-1 border-surface-variant/10">
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">KV Storage</p>
                   {status?.gmail_ready ? <Badge className="bg-green-500/10 text-green-600 border-none">Ready</Badge> : <Badge variant="destructive">Error</Badge>}
                </Card>
                <Card className="p-4 bg-surface-1 border-surface-variant/10">
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">Environment</p>
                   <Badge variant="secondary" className="font-black">{isProd ? 'Production' : 'Dev'}</Badge>
                </Card>
                <Card className="p-4 bg-surface-1 border-surface-variant/10">
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">Transport</p>
                   <Badge className="bg-primary/10 text-primary border-none">Gmail OAuth2</Badge>
                </Card>
              </div>
            </section>
            {status && !status.db_ready && (
              <Card className="border-destructive/30 bg-destructive/5 rounded-m3-xl shadow-none">
                <CardContent className="pt-6 flex gap-4 items-start">
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-destructive tracking-tight">Database Connection Failed</p>
                    <p className="text-sm text-destructive/80 font-medium leading-relaxed">
                      D1 binding <code className="bg-destructive/10 px-1 rounded font-bold">EMAIL_DB</code> is missing. 
                      Refer to <Link to="/docs" className="underline font-black">Step 1</Link> in documentation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <ShieldCheck className="h-4 w-4" /> Domain Identities
              </div>
              <Card className="rounded-m3-xl bg-surface-1 border border-surface-variant/10 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Discovery & Routing</CardTitle>
                  <CardDescription>Domains verified via Cloudflare Email Routing. Toggle to enable as sender identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isDomainsLoading || isStatusLoading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
                  ) : domains?.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-2xl opacity-40">
                      <Globe className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm font-bold">No domains found. Check CF_API_TOKEN secret.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-variant/10">
                      {domains?.map(d => (
                        <div key={d.id} className="py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-surface-2 flex items-center justify-center"><Globe className="h-5 w-5" /></div>
                            <div>
                              <p className="text-sm font-bold">{d.name}</p>
                              <Badge variant="secondary" className="text-[9px] uppercase font-black px-1.5 py-0">{d.status}</Badge>
                            </div>
                          </div>
                          <Switch checked={d.localEnabled} onCheckedChange={(val) => toggleDomain.mutate({ id: d.id, name: d.name, enabled: val })} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">Appearance & UI</div>
              <Card className="rounded-m3-xl bg-surface-1 border border-surface-variant/10 shadow-none">
                <CardContent className="p-0 divide-y divide-surface-variant/10">
                  <div className="flex items-center justify-between p-6">
                    <Label className="font-bold cursor-pointer" htmlFor="dark-mode">Dark Theme</Label>
                    <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                  <div className="flex items-center justify-between p-6">
                    <Label className="font-bold">Layout Density</Label>
                    <ToggleGroup type="single" value={density} onValueChange={(val) => val && setDensity(val as any)} className="bg-surface-2 p-1 rounded-full">
                      <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Comfortable</ToggleGroupItem>
                      <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Compact</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Bug className="h-4 w-4" /> Debug Tools
              </div>
              <Card className="rounded-m3-xl bg-primary/5 border border-primary/10 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Inbound Simulation</CardTitle>
                  <CardDescription>Manually trigger the Email Routing handler to inject a test message into D1.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => simulateMutation.mutate()}
                    disabled={simulateMutation.isPending || !status?.db_ready}
                    className="w-full rounded-full bg-primary font-bold h-12 shadow-lg shadow-primary/20 gap-2"
                  >
                    {simulateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />} Inject Simulation Email
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}