import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTheme } from '@/hooks/use-theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { User } from '@shared/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Moon, Sun, Trash2, RefreshCcw, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
export function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api<User>('/api/me'),
  });
  const resetData = useMutation({
    mutationFn: () => api('/api/init/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('All data has been reset to factory defaults.');
    },
    onError: () => toast.error('Failed to reset data.'),
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8">
          <header>
            <h1 className="text-3xl font-medium text-on-surface">Settings</h1>
            <p className="text-on-surface-variant mt-1">Manage your account and app preferences</p>
          </header>
          <div className="grid gap-6">
            {/* Account Section */}
            <Card className="rounded-m3-lg border-none bg-surface-1">
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary-container">
                  <AvatarImage src={user?.avatarUrl ?? `https://avatar.vercel.sh/${user?.email}`} />
                  <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-on-surface">{user?.name || 'Aero User'}</p>
                  <p className="text-sm text-on-surface-variant">{user?.email || 'user@aeromail.dev'}</p>
                </div>
              </CardContent>
            </Card>
            {/* Appearance Section */}
            <Card className="rounded-m3-lg border-none bg-surface-1">
              <CardHeader>
                <CardTitle className="text-lg text-on-surface">Appearance</CardTitle>
                <CardDescription>Personalize how AeroMail looks on your device</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Dark Theme</Label>
                    <p className="text-sm text-on-surface-variant">Switch between light and dark modes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                    <Switch checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Developer Tools */}
            <Card className="rounded-m3-lg border-none bg-surface-1 border-t border-destructive/10">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Developer Tools</CardTitle>
                <CardDescription>Simulation and debugging utilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-m3-md bg-destructive/5 border border-destructive/10">
                  <div className="space-y-0.5">
                    <p className="font-medium text-on-surface">Factory Reset</p>
                    <p className="text-sm text-on-surface-variant">Clear all emails and restore seed data</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="rounded-full gap-2"
                    onClick={() => {
                      if (confirm('Are you sure? This will delete all your current emails.')) {
                        resetData.mutate();
                      }
                    }}
                    disabled={resetData.isPending}
                  >
                    {resetData.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Reset Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}