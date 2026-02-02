import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, X, WifiOff, Download, AlertCircle, Archive, MailOpen, Inbox as InboxIcon } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDensity } from '@/hooks/use-density';
interface SwipeableEmailCardProps {
  email: Email;
  idx: number;
  density: string;
  onArchive: (id: string) => void;
  onToggleRead: (id: string, current: boolean) => void;
  onToggleStar: (id: string, current: boolean) => void;
}
function SwipeableEmailCard({ email, idx, density, onArchive, onToggleRead, onToggleStar }: SwipeableEmailCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [1, 1, 1]);
  const bgColorLeft = useTransform(x, [0, 100], ['rgba(255,255,255,0)', 'rgba(34, 197, 94, 0.2)']);
  const bgColorRight = useTransform(x, [-100, 0], ['rgba(59, 130, 246, 0.2)', 'rgba(255,255,255,0)']);
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (x.get() < -50) onArchive(email.id);
      x.set(0);
    },
    onSwipedRight: () => {
      if (x.get() > 50) onToggleRead(email.id, email.isRead);
      x.set(0);
    },
    onSwiping: (e) => {
      x.set(e.deltaX);
    },
    trackMouse: true,
  });
  return (
    <div className="relative overflow-hidden mb-1 rounded-m3-lg">
      <motion.div style={{ backgroundColor: bgColorLeft }} className="absolute inset-y-0 left-0 w-full flex items-center px-6 pointer-events-none">
        <MailOpen className="h-6 w-6 text-green-600 swipe-action-icon" />
      </motion.div>
      <motion.div style={{ backgroundColor: bgColorRight }} className="absolute inset-y-0 right-0 w-full flex items-center justify-end px-6 pointer-events-none">
        <Archive className="h-6 w-6 text-blue-600 swipe-action-icon" />
      </motion.div>
      <motion.div
        {...handlers}
        style={{ x, opacity }}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
        className={cn(
          "group relative flex items-start gap-3 cursor-pointer transition-all border border-transparent",
          density === 'compact' ? "p-2" : "p-4",
          email.isRead ? 'bg-transparent hover:bg-surface-1' : 'bg-surface-2 hover:bg-surface-3'
        )}
      >
        <button
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            onToggleStar(email.id, email.isStarred);
          }}
          className="shrink-0 pt-1 z-10"
        >
          <Star className={cn(
            "h-5 w-5 transition-colors",
            email.isStarred ? 'fill-tertiary text-tertiary' : 'text-on-surface-variant opacity-30 hover:opacity-100'
          )} />
        </button>
        <Link to={`/thread/${email.id}`} className="flex-1 min-w-0 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-2">
                {!email.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                <span className={cn("truncate", density === 'compact' ? "text-xs" : "text-sm", !email.isRead ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant')}>
                  {email.from.name}
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant shrink-0 font-medium">
                {format(email.timestamp, 'MMM d')}
              </span>
            </div>
            <h3 className={cn("truncate mb-0.5", density === 'compact' ? "text-xs" : "text-sm", !email.isRead ? 'font-semibold text-on-surface' : 'text-on-surface-variant')}>
              {email.subject}
            </h3>
            <p className="text-xs text-on-surface-variant line-clamp-1 opacity-70">
              {email.snippet}
            </p>
          </div>
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
  const { data: emails, isLoading, isFetching, error } = useQuery<Email[]>({
    queryKey: ['emails', folder],
    queryFn: () => api<Email[]>(`/api/emails?folder=${folder}`),
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
  const toggleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Email> }) =>
      api(`/api/emails/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] })
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
    mutationFn: () => api('/api/simulation/inbound', { method: 'POST', body: JSON.stringify({ subject: `Simulated: ${new Date().toLocaleTimeString()}` }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('New simulated email arrived!');
    }
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("py-4 md:py-8 lg:py-10 space-y-6")}>
          <header className="flex flex-col gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-50 group-focus-within:opacity-100 transition-opacity" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in mail"
                className="w-full h-12 pl-12 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-medium text-on-surface capitalize">
                  {searchQuery ? 'Results' : folder}
                </h1>
                <button onClick={() => queryClient.invalidateQueries({ queryKey: ['emails'] })} className={cn("p-2 rounded-full", isFetching && "animate-spin")}>
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => simulateInbound.mutate()} className="text-xs text-primary rounded-full">
                Simulate
              </Button>
            </div>
          </header>
          <section className="space-y-px">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Syncing...</p>
              </div>
            ) : filteredEmails.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredEmails.map((email, idx) => (
                  <SwipeableEmailCard
                    key={email.id}
                    email={email}
                    idx={idx}
                    density={density}
                    onArchive={handleArchive}
                    onToggleRead={handleToggleRead}
                    onToggleStar={handleToggleStar}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="p-6 bg-surface-1 rounded-full">
                  <InboxIcon className="h-12 w-12 text-on-surface-variant opacity-20" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Nothing here</h3>
                  <p className="text-sm text-on-surface-variant">Your {folder} is clear for now.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <Link to="/compose">
        <button className="m3-fab" aria-label="Compose">
          <Plus className="h-6 w-6" />
        </button>
      </Link>
    </AppLayout>
  );
}