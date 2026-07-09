import React, { useEffect } from 'react';
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
  Zap,
  Mail,
  ChevronRight,
  Database,
  CloudOff,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: user } = useQuery<User>({ queryKey: ['me'], queryFn: () => api<User>('/api/me') });
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: () => api<any>('/api/status') });
  const { data: authStatus } = useQuery({ queryKey: ['auth-status'], queryFn: () => api<{ connected: boolean }>('/api/auth/status') });
  useEffect(() => {
    if (searchParams.get('auth') === 'success') {
      toast.success("Google Account connected successfully!");
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
    }
  }, [searchParams, queryClient]);
  const disconnectMutation = useMutation({
    mutationFn: () => api('/api/auth/disconnect', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Disconnected from Google");
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
    }
  });
  const isMockMode = !status?.gmail_config;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
              <p className="text-muted-foreground">System and personal preferences</p>
            </div>
            {status && (
              <Badge variant={isMockMode ? "outline" : "secondary"} className={cn("h-7 px-3 rounded-full", isMockMode ? "border-yellow-500/50 text-yellow-700 bg-yellow-50" : "bg-green-100 text-green-700")}>
                {isMockMode ? <CloudOff className="h-3 w-3 mr-1.5" /> : <Database className="h-3 w-3 mr-1.5" />}
                {isMockMode ? "Simulation Mode" : "Production Edge"}
              </Badge>
            )}
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Zap className="h-5 w-5" /> Outbound Integration
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-surface-on">Gmail API Integration</p>
                        {authStatus?.connected && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] uppercase px-2">Connected</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Securely connect your Google Account to enable real outbound email delivery. Uses AES-GCM encryption for token storage.
                      </p>
                    </div>
                    {authStatus?.connected ? (
                      <Button onClick={() => disconnectMutation.mutate()} variant="outline" className="rounded-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
                        <Unlink className="h-4 w-4" /> Disconnect
                      </Button>
                    ) : (
                      <Button asChild disabled={isMockMode} className="rounded-full gap-2 bg-primary text-white shadow-lg shadow-primary/20">
                        <a href="/api/auth/login">
                          <LinkIcon className="h-4 w-4" /> Connect Google
                        </a>
                      </Button>
                    )}
                  </div>
                  {isMockMode && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-[10px] text-yellow-800 font-bold uppercase tracking-wider flex items-center gap-2">
                      <Database className="h-4 w-4" /> GMAIL_CLIENT_ID missing from environment. Integration unavailable.
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Layout className="h-5 w-5" /> Personalization
              </div>
              <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardContent className="p-0 divide-y divide-border">
                  <div className="flex items-center justify-between p-6">
                    <div className="space-y-0.5"><Label className="text-base font-bold text-surface-on">Night Mode</Label></div>
                    <Switch checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                  <div className="flex items-center justify-between p-6">
                    <div className="space-y-0.5"><Label className="text-base font-bold text-surface-on">UI Density</Label></div>
                    <ToggleGroup type="single" value={density} onValueChange={(val) => val && setDensity(val as any)} className="bg-muted p-1 rounded-full">
                      <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Comfortable</ToggleGroupItem>
                      <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Compact</ToggleGroupItem>
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