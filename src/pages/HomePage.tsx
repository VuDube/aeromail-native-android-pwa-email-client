import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread, FolderType } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, Archive, MailOpen, Inbox as InboxIcon, Users } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDensity } from '@/hooks/use-density';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
interface SwipeableThreadCardProps {
  thread: EmailThread;
  idx: number;
  density: string;
  onArchive: (id: string) => void;
  onToggleRead: (id: string, current: boolean) => void;
  onToggleStar: (id: string, current: boolean) => void;
}
function SwipeableThreadCard({ thread, idx, density, onArchive, onToggleRead, onToggleStar }: SwipeableThreadCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const bgColorLeft = useTransform(x, [0, 100], ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.2)']);
  const bgColorRight = useTransform(x, [-100, 0], ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0)']);
  const isRead = thread.unreadCount === 0;
  const latestMessageId = thread.messages[thread.messages.length - 1]?.id;
  const handlers = useSwipeable({
    onSwiping: (e) => x.set(e.deltaX * 0.8),
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > 100) onArchive(latestMessageId);
      x.set(0);
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > 100) onToggleRead(latestMessageId, isRead);
      x.set(0);
    },
    onSwiped: () => x.set(0),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });
  return (
    <div className="relative overflow-hidden mb-1 rounded-m3-lg group">
      <motion.div style={{ backgroundColor: bgColorLeft }} className="absolute inset-y-0 left-0 w-full flex items-center px-6 pointer-events-none z-0">
        <MailOpen className="h-6 w-6 text-green-600 swipe-action-icon" />
      </motion.div>
      <motion.div style={{ backgroundColor: bgColorRight }} className="absolute inset-y-0 right-0 w-full flex items-center justify-end px-6 pointer-events-none z-0">
        <Archive className="h-6 w-6 text-blue-600 swipe-action-icon" />
      </motion.div>
      <motion.div
        {...handlers}
        style={{ x, opacity }}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.02, 0.2) }}
        className={cn(
          "relative z-10 flex items-start gap-3 cursor-pointer transition-colors border-b border-surface-variant/30",
          density === 'compact' ? "p-2" : "p-4",
          isRead ? 'bg-background' : 'bg-surface-2 shadow-sm'
        )}
      >
        <div className="shrink-0 pt-1 flex flex-col items-center gap-2">
          <motion.div layoutId={`avatar-${thread.id}`}>
            <Avatar className={cn(density === 'compact' ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {thread.participantNames[0]?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <motion.button
            whileTap={{ scale: 1.5 }}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onToggleStar(latestMessageId, thread.isStarred);
            }}
            className="z-20"
          >
            <Star className={cn(
              "h-4 w-4 transition-all duration-200",
              thread.isStarred ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-surface-on-variant/30'
            )} />
          </motion.button>
        </div>
        <Link to={`/thread/${latestMessageId}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 truncate">
               <span className={cn(
                  "truncate text-sm",
                  !isRead ? 'font-bold text-surface-on' : 'font-medium text-surface-on-variant'
                )}>
                  {thread.participantNames.join(', ')}
                </span>
                {thread.messages.length > 1 && (
                  <span className="text-[10px] bg-surface-variant/50 px-1.5 rounded-full font-bold text-on-surface-variant">
                    {thread.messages.length}
                  </span>
                )}
            </div>
            <span className="text-[10px] text-surface-on-variant shrink-0 font-medium">
              {format(thread.lastMessageAt, 'MMM d')}
            </span>
          </div>
          <h3 className={cn(
            "truncate mb-0.5 text-sm",
            !isRead ? 'font-semibold text-surface-on' : 'text-surface-on-variant/80'
          )}>
            {thread.subject}
          </h3>
          <p className="text-xs text-surface-on-variant/60 line-clamp-1">
            {thread.snippet}
          </p>
        </Link>
      </motion.div>
    </div>
  );
}
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { density } = useDensity();
  const { data: threads, isLoading, isFetching } = useQuery<EmailThread[]>({
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
      api(`/api/emails/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threads'] })
  });
  const handleArchive = (id: string) => {
    toggleMutation.mutate({ id, updates: { folder: 'trash' } });
    toast.info("Moved to trash");
  };
  const handleToggleRead = (id: string, current: boolean) => {
    toggleMutation.mutate({ id, updates: { isRead: !current } });
    toast.info(!current ? "Marked as read" : "Marked as unread");
  };
  const handleToggleStar = (id: string, current: boolean) => {
    toggleMutation.mutate({ id, updates: { isStarred: !current } });
  };
  const simulateInbound = useMutation({
    mutationFn: () => api('/api/simulation/inbound', { method: 'POST', body: JSON.stringify({ subject: `Refactored Thread: ${new Date().toLocaleTimeString()}` }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('New conversation started');
    }
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 md:py-6 lg:py-8 space-y-6">
          <header className="flex flex-col gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-on-variant opacity-50 group-focus-within:opacity-100" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full h-12 pl-12 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-surface-on capitalize tracking-tight">
                  {searchQuery ? 'Search' : folder}
                </h1>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['threads'] })} className="h-8 w-8 p-0 rounded-full">
                   <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => simulateInbound.mutate()} className="h-8 text-xs rounded-full px-4 border-primary/20 text-primary">
                  Simulate Relational Data
                </Button>
              </div>
            </div>
          </header>
          <section className="space-y-px">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Querying optimized index...</p>
              </div>
            ) : filteredThreads.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread, idx) => (
                  <SwipeableThreadCard
                    key={thread.id}
                    thread={thread}
                    idx={idx}
                    density={density}
                    onArchive={handleArchive}
                    onToggleRead={handleToggleRead}
                    onToggleStar={handleToggleStar}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
                <div className="h-24 w-24 bg-surface-2 rounded-full flex items-center justify-center">
                  <InboxIcon className="h-10 w-10 text-surface-on-variant/20" />
                </div>
                <h3 className="text-lg font-bold">Inbox Optimized</h3>
                <p className="text-sm text-surface-on-variant/60 max-w-[200px]">No threads found in {folder}.</p>
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
          aria-label="Compose"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}