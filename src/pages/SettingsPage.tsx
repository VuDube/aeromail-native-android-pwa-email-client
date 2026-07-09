import React, { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTheme } from '@/hooks/use-theme';
import { useDensity } from '@/hooks/use-density';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User } from '@shared/types';
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
  CloudOff, 
  Database, 
  Link as LinkIcon, 
  Unlink,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: status } = useQuery({ 
    queryKey: ['status'], 
    queryFn: () => api<any>('/api/status') 
  });
  const { data: authStatus, isLoading: isAuthLoading } = useQuery({ 
    queryKey: ['auth-status'], 
    queryFn: () => api<{ connected: boolean }>('/api/auth/status') 
  });
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
  const isConfigMissing = status && !status.gmail_config;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="space-y-1">
            <h1 className="text-4xl font-black text-foreground tracking-tighter">Settings</h1>
            <p className="text-muted-foreground font-medium">Manage your AeroMail experience</p>
          </header>
          <div className="grid gap-8 max-w-4xl pb-40">
            {/* Outbound Integration Card */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Zap className="h-4 w-4" /> Outbound Integration
              </div>
              <Card className="rounded-m3-xl border-none bg-surface-1 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Gmail API Delivery
                    {authStatus?.connected && (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 border-none text-[10px] font-black uppercase">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Connect your Google Account to enable real outbound email via the Gmail API.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isConfigMissing ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-yellow-700">Gmail secrets missing</p>
                        <p className="text-xs text-yellow-600 leading-relaxed">
                          GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET is not configured in the worker environment. Integration is currently unavailable.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-surface-variant/10">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center",
                          authStatus?.connected ? "bg-green-500/10 text-green-600" : "bg-surface-3 text-surface-on-variant/40"
                        )}>
                          {authStatus?.connected ? <CheckCircle2 className="h-6 w-6" /> : <LinkIcon className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-surface-on">
                            {authStatus?.connected ? "Connected to Google" : "Not Connected"}
                          </p>
                          <p className="text-xs text-surface-on-variant opacity-60">
                            {authStatus?.connected ? "Ready to send real emails" : "Messages will be simulated in D1"}
                          </p>
                        </div>
                      </div>
                      {isAuthLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                      ) : authStatus?.connected ? (
                        <Button 
                          variant="ghost" 
                          onClick={() => disconnectMutation.mutate()}
                          className="rounded-full text-destructive hover:bg-destructive/10 font-bold"
                        >
                          <Unlink className="h-4 w-4 mr-2" /> Disconnect
                        </Button>
                      ) : (
                        <Button asChild className="rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/20">
                          <a href="/api/auth/login">Connect Account</a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
            {/* Appearance Section */}
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
                      <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Comfortable</ToggleGroupItem>
                      <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-black data-[state=on]:bg-primary data-[state=on]:text-white">Compact</ToggleGroupItem>
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