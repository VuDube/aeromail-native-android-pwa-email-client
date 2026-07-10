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
import { ShieldCheck, Loader2, Globe, Bug, Terminal, Zap } from 'lucide-react';
import { toast } from 'sonner';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: () => api<any>('/api/status') });
  const { data: domains, isLoading: isDomainsLoading } = useQuery({ queryKey: ['domains'], queryFn: () => api<DomainInfo[]>('/api/domains') });
  const toggleDomain = useMutation({
    mutationFn: (vars: { id: string, name: string, enabled: boolean }) =>
      api('/api/domains/toggle', {
        method: 'POST',
        body: JSON.stringify({ domainId: vars.id, domainName: vars.name, enabled: vars.enabled })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success("Identity settings updated");
    }
  });
  const simulateMutation = useMutation({
    mutationFn: () => api('/api/simulate/inbound', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Simulation email arrived");
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    }
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">Settings</h1>
            <p className="text-muted-foreground font-medium">Configure your email infrastructure</p>
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Bug className="h-4 w-4" /> Tools
              </div>
              <Card className="rounded-m3-xl bg-primary/5 border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Terminal className="h-5 w-5" /> Inbound Simulation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => simulateMutation.mutate()} disabled={simulateMutation.isPending} className="w-full rounded-full bg-primary font-bold h-12 shadow-lg shadow-primary/20 gap-2">
                    {simulateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Inject Test Email
                  </Button>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <ShieldCheck className="h-4 w-4" /> Domain Identities
              </div>
              <Card className="rounded-m3-xl bg-surface-1">
                <CardHeader>
                  <CardTitle className="text-lg">Available Domains</CardTitle>
                  <CardDescription>Domains discovered from your Cloudflare account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isDomainsLoading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
                  ) : domains?.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-2xl">
                      <Globe className="h-8 w-8 mx-auto opacity-20 mb-2" />
                      <p className="text-sm font-bold opacity-40">No Cloudflare zones found</p>
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
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">Appearance</div>
              <Card className="rounded-m3-xl bg-surface-1">
                <CardContent className="p-0 divide-y divide-surface-variant/10">
                  <div className="flex items-center justify-between p-6">
                    <Label className="font-bold cursor-pointer" htmlFor="dark-mode">Dark Mode</Label>
                    <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                  <div className="flex items-center justify-between p-6">
                    <Label className="font-bold">UI Density</Label>
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