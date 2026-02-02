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
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Moon, 
  Sun, 
  Trash2, 
  RefreshCcw, 
  User as UserIcon, 
  Layout, 
  Monitor, 
  ShieldCheck, 
  HelpCircle, 
  BookOpen, 
  ChevronRight 
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
  const resetData = useMutation({
    mutationFn: () => api('/api/init/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('System reset successfully');
    },
  });
  const clearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
      toast.success('Application cache cleared');
      setTimeout(() => window.location.reload(), 1000);
    }
  };
  const handleFactoryReset = () => {
    if (window.confirm('Are you absolutely sure you want to delete everything? This action cannot be undone.')) {
      resetData.mutate();
    }
  };
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
          <p className="text-on-surface-variant">Configure your personal email experience</p>
        </header>
        <div className="grid gap-8">
          {/* Identity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <UserIcon className="h-5 w-5" /> Account
            </div>
            <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm">
              <CardContent className="flex items-center gap-5 pt-6">
                <Avatar className="h-16 w-16 ring-4 ring-primary-container">
                  <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                  <AvatarFallback className="bg-primary text-on-primary text-xl">
                    {user?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold">{user?.name || 'Aero User'}</p>
                  <p className="text-sm text-on-surface-variant">{user?.email}</p>
                  <p className="text-[10px] mt-1 inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    <ShieldCheck className="h-3 w-3" /> Verified Account
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
          {/* Preferences */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Layout className="h-5 w-5" /> Appearance & Display
            </div>
            <Card className="rounded-m3-lg border-none bg-surface-1 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y">
                <div className="flex items-center justify-between p-6">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Dark Theme</Label>
                    <p className="text-xs text-on-surface-variant">Reduces eye strain in low light</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <Switch checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-6">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Density</Label>
                    <p className="text-xs text-on-surface-variant">Control how much content is visible</p>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={density} 
                    onValueChange={(val) => val && setDensity(val as any)} 
                    className="bg-surface-2 p-1 rounded-full"
                  >
                    <ToggleGroupItem value="comfortable" className="rounded-full px-4 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-white">Comfortable</ToggleGroupItem>
                    <ToggleGroupItem value="compact" className="rounded-full px-4 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-white">Compact</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>
          </section>
          {/* Help & Documentation */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <HelpCircle className="h-5 w-5" /> Help & Resources
            </div>
            <Link to="/docs" className="block">
              <Card className="rounded-m3-lg border-none bg-primary/5 hover:bg-primary/10 transition-colors shadow-sm cursor-pointer group">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-primary">Developer & PWA Guide</p>
                      <p className="text-xs text-on-surface-variant">Setup instructions, deployment, and PWA tips</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </section>
          {/* System */}
          <section className="space-y-4 pt-4 border-t border-surface-variant">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <Monitor className="h-5 w-5" /> System & Maintenance
            </div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 rounded-m3-lg bg-surface-1">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Purge Cache</p>
                  <p className="text-xs text-on-surface-variant">Force reload application assets</p>
                </div>
                <Button variant="outline" size="sm" onClick={clearCache} className="rounded-full">Clear Assets</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-m3-lg bg-destructive/5 border border-destructive/10">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-destructive">Factory Reset</p>
                  <p className="text-xs text-on-surface-variant">Destroys all local data and mocks</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleFactoryReset}
                  className="rounded-full"
                  disabled={resetData.isPending}
                >
                  {resetData.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {resetData.isPending ? 'Resetting...' : 'Reset System'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}