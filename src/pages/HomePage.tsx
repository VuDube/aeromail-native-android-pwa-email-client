import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2, RefreshCw, Archive, MailOpen, Inbox as InboxIcon } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDensity } from '@/hooks/use-density';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const bgColorLeft = useTransform(x, [0, 100], ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.2)']);
  const bgColorRight = useTransform(x, [-100, 0], ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0)']);
  const handlers = useSwipeable({
    onSwiping: (e) => {
      // Damping for swipe
      x.set(e.deltaX * 0.8);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > 100) {
        onArchive(email.id);
      }
      x.set(0);
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > 100) {
        onToggleRead(email.id, email.isRead);
      }
      x.set(0);
    },
    onSwiped: () => {
      x.set(0);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 10,
  });
  return (
    <div className="relative overflow-hidden mb-1 rounded-m3-lg group">
      {/* Background Actions */}
      <motion.div style={{ backgroundColor: bgColorLeft }} className="absolute inset-y-0 left-0 w-full flex items-center px-6 pointer-events-none z-0">
        <MailOpen className="h-6 w-6 text-green-600 swipe-action-icon" />
      </motion.div>
      <motion.div style={{ backgroundColor: bgColorRight }} className="absolute inset-y-0 right-0 w-full flex items-center justify-end px-6 pointer-events-none z-0">
        <Archive className="h-6 w-6 text-blue-600 swipe-action-icon" />
      </motion.div>
      {/* Foreground Content */}
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
          email.isRead ? 'bg-background' : 'bg-surface-2'
        )}
      >
        <div className="shrink-0 pt-1 flex flex-col items-center gap-2">
          <motion.div layoutId={`avatar-${email.id}`}>
            <Avatar className={cn(density === 'compact' ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarImage src={`https://avatar.vercel.sh/${email.from.email}`} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {email.from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <motion.button
            whileTap={{ scale: 1.5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onToggleStar(email.id, email.isStarred);
            }}
            className="z-20"
          >
            <Star className={cn(
              "h-5 w-5 transition-all duration-200",
              email.isStarred ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-on-surface-variant/30 hover:text-on-surface-variant'
            )} />
          </motion.button>
        </div>
        <Link to={`/thread/${email.id}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <motion.span 
              layoutId={`sender-${email.id}`}
              className={cn(
                "truncate", 
                density === 'compact' ? "text-xs" : "text-sm", 
                !email.isRead ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'
              )}
            >
              {email.from.name}
            </motion.span>
            <span className="text-[10px] text-on-surface-variant shrink-0 font-medium">
              {format(email.timestamp, 'MMM d')}
            </span>
          </div>
          <motion.h3 
            layoutId={`subject-${email.id}`}
            className={cn(
              "truncate mb-0.5", 
              density === 'compact' ? "text-xs" : "text-sm", 
              !email.isRead ? 'font-semibold text-on-surface' : 'text-on-surface-variant/80'
            )}
          >
            {email.subject}
          </motion.h3>
          <p className="text-xs text-on-surface-variant/60 line-clamp-1">
            {email.snippet}
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
  const { data: emails, isLoading, isFetching } = useQuery<Email[]>({
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
    mutationFn: () => api('/api/simulation/inbound', { method: 'POST', body: JSON.stringify({ subject: `Inbound: ${new Date().toLocaleTimeString()}` }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('New message received');
    }
  });
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("py-4 md:py-6 lg:py-8 space-y-6")}>
          <header className="flex flex-col gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-50 group-focus-within:opacity-100 transition-opacity" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mail"
                className="w-full h-12 pl-12 pr-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-on-surface capitalize tracking-tight">
                  {searchQuery ? 'Search' : folder}
                </h1>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['emails'] })} className="h-8 w-8 p-0 rounded-full">
                   <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => simulateInbound.mutate()} className="h-8 text-xs rounded-full px-4 border-primary/20 text-primary">
                  Simulate Inbound
                </Button>
              </div>
            </div>
          </header>
          <section className="space-y-px">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Synchronizing mailbox...</p>
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
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 text-center gap-6"
              >
                <div className="h-24 w-24 bg-surface-2 rounded-full flex items-center justify-center">
                  <InboxIcon className="h-10 w-10 text-on-surface-variant/20" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Mailbox is empty</h3>
                  <p className="text-sm text-on-surface-variant/60 max-w-[200px]">You have no messages in {folder}.</p>
                </div>
              </motion.div>
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