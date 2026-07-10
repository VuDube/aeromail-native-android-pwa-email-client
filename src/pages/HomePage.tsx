import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread } from '@shared/types';
import { Plus, Search, Loader2, RefreshCw, Inbox as InboxIcon, Sparkles, Info, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDensity } from '@/hooks/use-density';
import { ThreadCard } from '@/components/email/ThreadCard';
import { cn } from '@/lib/utils';
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { density } = useDensity();
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status')
  });
  const { data: threads, isLoading, isFetching, error } = useQuery<EmailThread[]>({
    queryKey: ['threads', folder, searchQuery],
    queryFn: () => api<EmailThread[]>(`/api/emails?folder=${folder}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`),
  });
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
          <Button onClick={() => window.location.reload()} className="rounded-full px-10 h-12 font-bold shadow-xl shadow-primary/20">
            Retry Connection
          </Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <header className="space-y-10 mb-10">
            <div className="flex items-center justify-between">
              <h1 className="text-5xl font-black tracking-tighter capitalize">{folder}</h1>
              <div className="flex items-center gap-2">
                {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />}
                <Button variant="ghost" size="icon" onClick={handleRefresh} className="rounded-full hover:bg-surface-2">
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="relative group max-w-3xl mx-auto w-full">
              <motion.div
                animate={{ 
                  scale: isSearchFocused ? 1.02 : 1,
                  y: isSearchFocused ? -4 : 0,
                  boxShadow: isSearchFocused ? '0 20px 40px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.02)'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                  "relative flex items-center bg-surface-2 rounded-2xl transition-all border-2 border-transparent",
                  isSearchFocused && "bg-background border-primary/20"
                )}
              >
                <Search className={cn(
                  "absolute left-5 h-5 w-5 transition-colors",
                  isSearchFocused ? "text-primary" : "text-surface-on-variant opacity-40"
                )} />
                <Input
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in mail..."
                  className="w-full h-14 pl-14 pr-12 rounded-2xl bg-transparent border-none focus-visible:ring-0 text-base font-bold"
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-variant/20"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </header>
          <section className="space-y-px pb-32">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center gap-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Syncing Conversations...</p>
              </div>
            ) : threads && threads.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {threads.map((thread, idx) => (
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
                  <h3 className="text-2xl font-black">No messages found</h3>
                  <p className="text-surface-on-variant text-sm max-w-xs mx-auto">Try a different search query or check another folder.</p>
                  {searchQuery && (
                    <Button variant="link" onClick={() => setSearchQuery('')} className="text-primary font-bold">
                      Clear Search
                    </Button>
                  )}
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