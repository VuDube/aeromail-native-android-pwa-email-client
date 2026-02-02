import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, X, WifiOff, Download, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);
  const { data: emails, isLoading, isFetching, error } = useQuery<Email[]>({
    queryKey: ['emails', folder],
    queryFn: () => api<Email[]>(`/api/emails?folder=${folder}`),
    retry: 2,
  });
  const filteredEmails = useMemo(() => {
    if (!emails) return [];
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter(e =>
      e.subject.toLowerCase().includes(q) ||
      e.from.name.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);
  const simulateInbound = useMutation({
    mutationFn: () => api('/api/simulation/inbound', {
      method: 'POST',
      body: JSON.stringify({ subject: `New Message ${Date.now()}` })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('New email received!');
    }
  });
  const toggleStar = useMutation({
    mutationFn: ({ id, isStarred }: { id: string, isStarred: boolean }) =>
      api(`/api/emails/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isStarred: !isStarred })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] })
  });
  useEffect(() => {
    api('/api/init').catch((err) => {
      console.error('[INIT FAILED]', err);
    });
  }, []);
  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['emails', folder] });
      toast.info('Inbox updated');
    } catch (e) {
      toast.error('Refresh failed');
    }
  };
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-6">
          <header className="flex flex-col gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-50 group-focus-within:opacity-100 transition-opacity" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in mail"
                className="w-full h-12 pl-12 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-3 transition-colors"
                >
                  <X className="h-4 w-4 text-on-surface-variant" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-medium text-on-surface capitalize">
                  {searchQuery ? 'Search Results' : folder}
                </h1>
                {isOffline && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </div>
                )}
                <button
                  onClick={handleRefresh}
                  className={cn("p-2 rounded-full hover:bg-surface-2 transition-colors", isFetching && "animate-spin")}
                >
                  <RefreshCw className="h-4 w-4 text-on-surface-variant" />
                </button>
              </div>
              {!searchQuery && !isOffline && (
                <div className="flex items-center gap-2">
                  {deferredPrompt && (
                    <Button variant="outline" size="sm" onClick={handleInstall} className="rounded-full h-8 text-xs gap-1.5 border-primary/20 text-primary">
                      <Download className="h-3.5 w-3.5" />
                      Install
                    </Button>
                  )}
                  <button
                    onClick={() => simulateInbound.mutate()}
                    className="text-xs font-medium text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-full"
                    disabled={simulateInbound.isPending}
                  >
                    Simulate Inbound
                  </button>
                </div>
              )}
            </div>
          </header>
          <section className="space-y-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Syncing your inbox...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-on-surface">Connection Error</p>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    {error instanceof Error ? error.message : "We couldn't reach the server. Please try again."}
                  </p>
                </div>
                <Button onClick={handleRefresh} variant="outline" className="rounded-full">
                  Retry Connection
                </Button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredEmails.map((email, idx) => (
                  <motion.div
                    key={email.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.2) }}
                    className={cn(
                      "group relative flex items-start gap-4 p-4 rounded-m3-lg cursor-pointer transition-all border border-transparent mb-1",
                      email.isRead ? 'bg-transparent hover:bg-surface-1' : 'bg-surface-2 hover:bg-surface-3'
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStar.mutate({ id: email.id, isStarred: email.isStarred });
                      }}
                      className="shrink-0 pt-1 z-10"
                    >
                      <Star className={cn(
                        "h-5 w-5 transition-colors",
                        email.isStarred ? 'fill-tertiary text-tertiary' : 'text-on-surface-variant opacity-30 hover:opacity-100'
                      )} />
                    </button>
                    <Link to={`/thread/${email.id}`} className="flex-1 min-w-0 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2">
                            {!email.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                            <span className={cn("text-sm truncate", !email.isRead ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant')}>
                              {email.from.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant shrink-0 font-medium">
                            {format(email.timestamp, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <h3 className={cn("text-sm truncate mb-0.5", !email.isRead ? 'font-semibold text-on-surface' : 'text-on-surface-variant')}>
                          {email.subject}
                        </h3>
                        <p className="text-xs text-on-surface-variant line-clamp-1 opacity-70">
                          {email.snippet}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {!isLoading && !error && filteredEmails.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="text-6xl grayscale opacity-50">
                  {searchQuery ? '��' : '📭'}
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface font-medium text-lg">
                    {searchQuery ? `No results for "${searchQuery}"` : `Your ${folder} is empty`}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    {searchQuery ? 'Try searching for different keywords.' : 'Messages in this folder will appear here.'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <AnimatePresence>
        {(!searchQuery || window.innerWidth > 768) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Link to="/compose">
              <button
                className="m3-fab lg:h-16 lg:w-44 lg:rounded-2xl lg:gap-3 z-30"
                aria-label="Compose email"
              >
                <Plus className="h-6 w-6" />
                <span className="hidden lg:block font-medium text-sm">Compose</span>
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}