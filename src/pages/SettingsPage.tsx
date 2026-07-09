import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTheme } from '@/hooks/use-theme';
import { useDensity } from '@/hooks/use-density';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User } from '@shared/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  RefreshCcw,
  User as UserIcon,
  Layout,
  ShieldCheck,
  MailPlus,
  Wand2,
  Database,
  CloudOff,
  AlertTriangle,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api<User>('/api/me'),
  });
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status'),
  });
  const isMockMode = status?.mode === 'mock';
  const resetData = useMutation({
    mutationFn: () => api('/api/init/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Factory reset completed');
      setTimeout(() => window.location.href = '/', 1500);
    },
    onError: (err: any) => {
      toast.error('Reset failed: ' + err.message);
    }
  });
  const simulateInbound = useMutation({
    mutationFn: () => api('/api/simulate/inbound', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Mock email received!');
    },
    onError: (err: any) => {
      toast.error('Simulation failed: ' + err.message);
    }
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-surface-on tracking-tight">Settings</h1>
              <p className="text-surface-on-variant">System and personal preferences</p>
            </div>
            {status && (
              <Badge variant={isMockMode ? "outline" : "secondary"} className={cn("h-7 px-3 rounded-full", isMockMode ? "border-yellow-500/50 text-yellow-700 bg-yellow-50" : "bg-green-100 text-green-700")}>
                {isMockMode ? <CloudOff className="h-3 w-3 mr-1.5" /> : <Database className="h-3 w-3 mr-1.5" />}
                {isMockMode ? "Mock Sandbox" : "Production D1"}
              </Badge>
            )}
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            {isMockMode && (
              <section className="bg-yellow-50 border border-yellow-200 rounded-m3-lg p-6 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <AlertTriangle className="h-6 w-6 text-yellow-600 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-yellow-800">Limited Capability</p>
                  <p className="text-sm text-yellow-700 leading-relaxed">
                    D1 database binding <code className="bg-yellow-100 px-1 rounded">EMAIL_DB</code> was not found. Persistent actions like resetting or receiving emails are simulated in-memory and will not persist across reloads.
                  </p>
                </div>
              </section>
            )}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <UserIcon className="h-5 w-5" /> Account
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm">
                <CardContent className="flex items-center gap-5 pt-6">
                  <Avatar className="h-16 w-16 ring-4 ring-primary-container/30">
                    <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">{user?.name || 'Aero User'}</p>
                    <p className="text-sm text-surface-on-variant">{user?.email}</p>
                    <p className="text-[10px] mt-1 inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      <ShieldCheck className="h-3 w-3" /> Secure Edge Identity
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Layout className="h-5 w-5" /> Personalization
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardContent className="p-0 divide-y divide-surface-variant/10">
                  <div className="flex items-center justify-between p-6">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">Night Mode</Label>
                      <p className="text-xs text-surface-on-variant">Switch to high-contrast dark interface</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={isDark} onCheckedChange={toggleTheme} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-6">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">UI Density</Label>
                      <p className="text-xs text-surface-on-variant">Compact shows 30% more content</p>
                    </div>
                    <ToggleGroup
                      type="single"
                      value={density}
                      onValueChange={(val) => val && setDensity(val as any)}
                      className="bg-surface-2 p-1 rounded-full"
                    >
                      <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Comfortable</ToggleGroupItem>
                      <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Compact</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Wand2 className="h-5 w-5" /> Automation
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Inbound Traffic Mock</Label>
                    <p className="text-xs text-surface-on-variant">Generate a sample incoming email thread</p>
                  </div>
                  <Button
                    onClick={() => simulateInbound.mutate()}
                    disabled={simulateInbound.isPending}
                    className="rounded-full gap-2 px-6 bg-primary-container text-primary-on-container hover:bg-primary/20"
                  >
                    {simulateInbound.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                    Test Inbox
                  </Button>
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Cpu className="h-5 w-5" /> System Info
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-surface-on-variant tracking-widest">Version</p>
                    <p className="font-bold">{status?.version || '1.0.5'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-surface-on-variant tracking-widest">Region</p>
                    <p className="font-bold">{status?.location || 'Local'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-surface-on-variant tracking-widest">Engine</p>
                    <p className="font-bold">Cloudflare Workers</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-surface-on-variant tracking-widest">Persistence</p>
                    <p className="font-bold">{status?.storage || 'Memory'}</p>
                  </div>
                </div>
              </Card>
            </section>
            <section className="space-y-4 pt-8 border-t border-surface-variant/10">
              <div className="flex items-center gap-2 text-destructive font-bold">
                <Trash2 className="h-5 w-5" /> Danger Zone
              </div>
              <div className="flex items-center justify-between p-6 rounded-m3-lg bg-destructive/5 border border-destructive/10">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-destructive">Wipe Database</p>
                  <p className="text-xs text-surface-on-variant">Irreversibly delete all emails and threads</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => window.confirm('This will delete all conversations permanently. Proceed?') && resetData.mutate()}
                  className="rounded-full px-6"
                  disabled={resetData.isPending || isMockMode}
                >
                  {resetData.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "Factory Reset"}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}