import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread } from '@shared/types';
import { Plus, Search, Loader2, RefreshCw, Inbox as InboxIcon, Sparkles, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDensity } from '@/hooks/use-density';
import { ThreadCard } from '@/components/email/ThreadCard';
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { density } = useDensity();
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status')
  });
  const { data: threads, isLoading, isFetching, error } = useQuery<EmailThread[]>({
    queryKey: ['threads', folder],
    queryFn: () => api<EmailThread[]>(`/api/emails?folder=${folder}`),
  });
  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.participantNames.some(p => p.toLowerCase().includes(q)) ||
      t.snippet.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);
  const toggleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: any }) =>
      api(`/api/threads/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient?.invalidateQueries({ queryKey: ['threads'] })
  });
  const handleRefresh = useCallback(() => {
    queryClient?.invalidateQueries({ queryKey: ['threads'] });
    toast.success("Inbox updated");
  }, [queryClient]);
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-40 flex flex-col items-center justify-center gap-6">
          <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <Info className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-destructive font-black text-2xl tracking-tight">Infrastructure Error</h2>
            <p className="text-muted-foreground text-sm max-w-md">{(error as any).message}</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Button onClick={() => window.location.reload()} className="rounded-full px-10 h-12 font-bold shadow-xl shadow-primary/20">
              Retry Connection
            </Button>
          </motion.div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          {status?.demo_mode && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-5 bg-primary/5 border border-primary/20 rounded-m3-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:bg-primary/10"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-primary text-sm font-black uppercase tracking-wider">Demo Mode Active</p>
                <p className="text-foreground/70 text-sm font-medium">Running on mock data. Setup Cloudflare D1 for real persistence.</p>
              </div>
              <Button asChild variant="outline" className="rounded-full border-primary/30 text-primary font-bold gap-2 hover:bg-primary hover:text-white transition-all">
                <Link to="/docs">
                  Setup Guide <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          )}
          <header className="space-y-6 mb-10">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-on-variant opacity-40 group-focus-within:text-primary transition-all" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your conversations..."
                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-surface-2 border-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm text-base font-bold transition-all"
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black tracking-tighter capitalize">{folder}</h1>
                {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />}
              </div>
              <Button variant="ghost" size="icon" onClick={handleRefresh} className="rounded-full bg-surface-1 hover:bg-surface-2 transition-colors">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <section className="space-y-px pb-32">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center gap-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Syncing Conversations...</p>
              </div>
            ) : filteredThreads.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread, idx) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    idx={idx}
                    density={density}
                    onArchive={(id) => {
                      toggleMutation.mutate({ id, updates: { folder: 'trash' } });
                      toast.info("Moved to trash");
                    }}
                    onToggleRead={(id, cur) => {
                      toggleMutation.mutate({ id, updates: { isRead: !cur } });
                    }}
                    onToggleStar={(id, cur) => {
                      toggleMutation.mutate({ id, updates: { isStarred: !cur } });
                    }}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-24 md:py-32 flex flex-col items-center text-center gap-8 bg-surface-1/30 rounded-[48px] border-2 border-dashed border-surface-variant/10 mx-auto max-w-lg">
                <div className="relative">
                  <div className="h-24 w-24 bg-primary-container/20 rounded-full flex items-center justify-center">
                    <InboxIcon className="h-12 w-12 text-primary/30" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="space-y-2 px-8">
                  <h3 className="text-2xl font-black">Everything caught up</h3>
                  <p className="text-surface-on-variant text-sm max-w-xs mx-auto">No messages found in {folder}. Enjoy the clear space!</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <Link to="/compose">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="m3-fab shadow-xl shadow-primary/30"
          aria-label="Compose new email"
        >
          <Plus className="h-10 w-10" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}