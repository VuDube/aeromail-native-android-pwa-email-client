import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread, FolderType } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, Archive, MailOpen, Inbox as InboxIcon, Sparkles, CloudOff } from 'lucide-react';
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
  const opacity = useTransform(x, [-150, 0, 150], [0.6, 1, 0.6]);
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
      <div className="absolute inset-0 flex items-center justify-between px-6 z-0 pointer-events-none">
        <MailOpen className="h-6 w-6 text-green-500 opacity-40" />
        <Archive className="h-6 w-6 text-blue-500 opacity-40" />
      </div>
      <motion.div
        {...handlers}
        style={{ x, opacity }}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.02, 0.2) }}
        className={cn(
          "relative z-10 flex items-start gap-4 cursor-pointer transition-all border-b border-surface-variant/20",
          density === 'compact' ? "p-3" : "p-5",
          isRead ? 'bg-background hover:bg-surface-1' : 'bg-primary/5 hover:bg-primary/10 shadow-sm border-l-4 border-l-primary'
        )}
      >
        <div className="shrink-0 pt-1 flex flex-col items-center gap-3">
          <Avatar className={cn(density === 'compact' ? "h-9 w-9" : "h-12 w-12", "ring-2 ring-background shadow-sm")}>
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-black">
              {thread.participantNames[0]?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(latestMessageId, thread.isStarred); }}
            className="z-20 p-1 rounded-full hover:bg-surface-variant/20 transition-colors"
          >
            <Star className={cn("h-5 w-5 transition-all", thread.isStarred ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-on-surface-variant/20')} />
          </button>
        </div>
        <Link to={`/thread/${latestMessageId}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={cn("truncate text-sm tracking-tight", !isRead ? 'font-black text-on-surface' : 'font-semibold text-on-surface-variant opacity-70')}>
              {thread.participantNames.join(', ')}
            </span>
            <span className="text-[11px] font-bold text-on-surface-variant opacity-50 shrink-0">
              {format(thread.lastMessageAt, 'HH:mm')}
            </span>
          </div>
          <h3 className={cn("truncate mb-1 text-sm font-bold tracking-tight", !isRead ? 'text-on-surface' : 'text-on-surface-variant opacity-80')}>
            {thread.subject}
          </h3>
          <p className="text-xs text-on-surface-variant opacity-60 line-clamp-1 leading-relaxed">
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
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => api<any>('/api/status'),
  });
  const { data: threads, isLoading, isFetching, error } = useQuery<EmailThread[]>({
    queryKey: ['threads', folder],
    queryFn: () => api<EmailThread[]>(`/api/emails?folder=${folder}`),
  });
  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t => t.subject.toLowerCase().includes(q) || t.participantNames.some(p => p.toLowerCase().includes(q)) || t.snippet.toLowerCase().includes(q));
  }, [threads, searchQuery]);
  const toggleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: any }) => api(`/api/emails/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threads'] })
  });
  const isMock = status?.mode === 'mock';
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-10">
          <header className="space-y-6 sticky top-0 bg-background/80 backdrop-blur-xl pt-2 pb-6 z-20">
            {isMock && (
              <div className="bg-yellow-100/50 border border-yellow-200 px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black text-yellow-700 uppercase tracking-widest shadow-sm">
                <CloudOff className="h-3 w-3" /> 
                Running in Mock Mode - Storage persistence limited
              </div>
            )}
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-30 group-focus-within:opacity-100 transition-opacity" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-16 pl-14 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary shadow-sm text-lg font-medium"
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black text-on-surface capitalize tracking-tighter">
                  {searchQuery ? 'Search' : folder}
                </h1>
                {isFetching && <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['threads'] })}
                className="h-12 w-12 p-0 rounded-full bg-surface-1 shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                 <RefreshCw className="h-6 w-6" />
              </Button>
            </div>
          </header>
          <section className="space-y-px pb-32">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <div className="h-16 w-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-black text-on-surface-variant tracking-[0.3em] uppercase opacity-30">Synchronizing Edge</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-m3-xl p-8 text-center space-y-4">
                <p className="text-destructive font-bold">Failed to load conversations</p>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                  {error instanceof Error ? error.message : "Ensure your Cloudflare D1 database is correctly bound in wrangler.jsonc."}
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry Connection</Button>
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
                      if (isMock) { toast.error("Archiving disabled in Mock Mode"); return; }
                      toggleMutation.mutate({ id, updates: { folder: 'trash' } }); 
                      toast.info("Moved to trash"); 
                    }}
                    onToggleRead={(id, cur) => { 
                      if (isMock) { toast.error("Updating read status disabled in Mock Mode"); return; }
                      toggleMutation.mutate({ id, updates: { isRead: !cur } }); 
                      toast.info(!cur ? "Marked read" : "Marked unread"); 
                    }}
                    onToggleStar={(id, cur) => {
                      if (isMock) { toast.error("Starring disabled in Mock Mode"); return; }
                      toggleMutation.mutate({ id, updates: { isStarred: !cur } })
                    }}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-48 text-center gap-8 bg-surface-1/50 rounded-m3-xl border-2 border-dashed border-surface-variant/20"
              >
                <div className="relative">
                  <div className="h-28 w-28 bg-primary/5 rounded-full flex items-center justify-center">
                    <InboxIcon className="h-14 w-14 text-primary/20" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary/30 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight text-on-surface">Inbox Clean</h3>
                  <p className="text-sm text-on-surface-variant max-w-[280px] leading-relaxed">
                    Everything is sorted. {isMock ? "Mock fallback data is being served." : "Use Simulation tools in Settings to generate data."}
                  </p>
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </div>
      <Link to="/compose">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className="m3-fab shadow-2xl shadow-primary/40 bg-primary text-white h-16 w-16 rounded-[24px]"
          aria-label="Compose"
        >
          <Plus className="h-10 w-10" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}