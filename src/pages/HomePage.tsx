import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread, FolderType } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, Archive, MailOpen, Inbox as InboxIcon } from 'lucide-react';
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
          <Avatar className={cn(density === 'compact' ? "h-8 w-8" : "h-10 w-10")}>
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {thread.participantNames[0]?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onToggleStar(latestMessageId, thread.isStarred);
            }}
            className="z-20 p-1"
          >
            <Star className={cn(
              "h-4 w-4 transition-all duration-200",
              thread.isStarred ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-surface-on-variant/30'
            )} />
          </button>
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
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8">
          <header className="flex flex-col gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-on-variant opacity-50 group-focus-within:opacity-100" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full h-14 pl-12 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-surface-on capitalize tracking-tighter">
                  {searchQuery ? 'Search' : folder}
                </h1>
                {isFetching && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['threads'] })} 
                className="h-10 w-10 p-0 rounded-full bg-surface-1"
              >
                 <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <section className="space-y-px">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase animate-pulse">Relational Sync...</p>
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
              <div className="flex flex-col items-center justify-center py-40 text-center gap-8 bg-surface-1 rounded-m3-xl border-2 border-dashed border-surface-variant/30">
                <div className="h-24 w-24 bg-surface-2 rounded-full flex items-center justify-center">
                  <InboxIcon className="h-12 w-12 text-surface-on-variant/20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight">Inbox Clean</h3>
                  <p className="text-sm text-surface-on-variant/60 max-w-[240px]">No relational data found in {folder}.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <Link to="/compose">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="m3-fab shadow-2xl shadow-primary/40 bg-primary text-white"
          aria-label="Compose"
        >
          <Plus className="h-8 w-8" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}