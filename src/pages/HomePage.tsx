import React, { useState, useMemo, forwardRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, Archive, MailOpen, Inbox as InboxIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDensity } from '@/hooks/use-density';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
interface SwipeableThreadCardProps {
  thread: EmailThread;
  idx: number;
  density: string;
  onArchive: (id: string) => void;
  onToggleRead: (id: string, current: boolean) => void;
  onToggleStar: (id: string, current: boolean) => void;
}
const SwipeableThreadCard = forwardRef<HTMLDivElement, SwipeableThreadCardProps>(
  ({ thread, idx, density, onArchive, onToggleRead, onToggleStar }, ref) => {
    const x = useMotionValue(0);
    const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95]);
    const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);
    const isRead = thread.unreadCount === 0;
    const handlers = useSwipeable({
      onSwiping: (e) => {
        const threshold = 120;
        if (Math.abs(e.deltaX) >= threshold && Math.abs(x.get()) < threshold) {
          if ('vibrate' in navigator) navigator.vibrate(10);
        }
        x.set(e.deltaX * 0.6);
      },
      onSwipedLeft: (e) => {
        if (Math.abs(e.deltaX) > 120) onArchive(thread.id);
        x.set(0);
      },
      onSwipedRight: (e) => {
        if (Math.abs(e.deltaX) > 120) onToggleRead(thread.id, isRead);
        x.set(0);
      },
      onSwiped: () => x.set(0),
      trackMouse: true,
      preventScrollOnSwipe: true,
    });
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(idx * 0.05, 0.5) }}
        className="relative overflow-hidden mb-1 rounded-m3-lg group"
      >
        <div className="absolute inset-0 flex items-center justify-between px-8 z-0 pointer-events-none">
          <motion.div style={{ opacity: useTransform(x, [0, 100], [0, 1]) }} className="flex items-center gap-2 text-green-600 font-bold">
            <MailOpen className="h-6 w-6" /> <span>Read</span>
          </motion.div>
          <motion.div style={{ opacity: useTransform(x, [0, -100], [0, 1]) }} className="flex items-center gap-2 text-blue-600 font-bold">
            <span>Archive</span> <Archive className="h-6 w-6" />
          </motion.div>
        </div>
        <motion.div
          {...handlers}
          style={{ x, scale, opacity }}
          className={cn(
            "relative z-10 flex items-start gap-4 transition-colors border-b border-surface-variant/10 cursor-pointer",
            density === 'compact' ? "p-3" : "p-5",
            isRead ? 'bg-background hover:bg-surface-1' : 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
          )}
        >
          <div className="shrink-0 flex flex-col items-center gap-3">
            <Avatar className={cn(density === 'compact' ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarFallback className="bg-primary-container text-on-primary-container font-black text-sm uppercase">
                {thread.participantNames[0]?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(thread.id, thread.isStarred); }}
              className="p-1 rounded-full hover:bg-surface-variant/20 transition-colors"
            >
              <Star className={cn("h-5 w-5", thread.isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-on-surface-variant/30')} />
            </button>
          </div>
          <Link to={`/thread/${thread.id}`} className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className={cn("truncate text-sm tracking-tight", !isRead ? "font-black" : "font-bold text-on-surface-variant")}>
                {thread.participantNames.join(', ')}
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant opacity-60">
                {format(thread.lastMessageAt, 'HH:mm')}
              </span>
            </div>
            <h3 className={cn("truncate text-sm font-bold tracking-tight mb-1", !isRead ? "text-on-surface" : "text-on-surface-variant/80")}>
              {thread.subject}
            </h3>
            <p className="text-xs text-on-surface-variant/60 line-clamp-1 leading-relaxed">
              {thread.snippet}
            </p>
          </Link>
        </motion.div>
      </motion.div>
    );
  }
);
SwipeableThreadCard.displayName = 'SwipeableThreadCard';
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { density } = useDensity();
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threads'] })
  });
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['threads'] });
  }, [queryClient]);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <header className="space-y-6 mb-10">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-40 group-focus-within:text-primary transition-all" />
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
              <Button variant="ghost" size="icon" onClick={handleRefresh} className="rounded-full bg-surface-1">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <section className="space-y-px pb-32">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center gap-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Connecting...</p>
              </div>
            ) : filteredThreads.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread, idx) => (
                  <SwipeableThreadCard
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
              <div className="py-32 flex flex-col items-center text-center gap-8 bg-surface-1/50 rounded-[32px] border-2 border-dashed border-surface-variant/10 mx-auto max-w-md">
                <div className="relative">
                  <div className="h-24 w-24 bg-primary-container/20 rounded-full flex items-center justify-center">
                    <InboxIcon className="h-12 w-12 text-primary/30" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black">All Clear</h3>
                  <p className="text-on-surface-variant text-sm px-10">Your inbox is empty. Enjoy the peace and quiet.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <Link to="/compose">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="m3-fab shadow-primary/30">
          <Plus className="h-10 w-10" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}