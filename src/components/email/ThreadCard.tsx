import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { EmailThread } from '@shared/types';
import { format, isToday, isYesterday } from 'date-fns';
import { Star, Archive, MailOpen } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
function smartFormatDate(timestamp: number) {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}
interface ThreadCardProps {
  thread: EmailThread;
  idx: number;
  density: string;
  onArchive: (id: string) => void;
  onToggleRead: (id: string, current: boolean) => void;
  onToggleStar: (id: string, current: boolean) => void;
}
export const ThreadCard = React.memo(forwardRef<HTMLDivElement, ThreadCardProps>(
  ({ thread, idx, density, onArchive, onToggleRead, onToggleStar }, ref) => {
    const x = useMotionValue(0);
    const scale = useTransform(x, [-100, 0, 100], [0.98, 1, 0.98]);
    const opacity = useTransform(x, [-150, 0, 150], [0.4, 1, 0.4]);
    const isRead = thread.unreadCount === 0;
    const ACTION_THRESHOLD = 140;
    const handlers = useSwipeable({
      onSwiping: (e) => {
        const currentX = x.get();
        if (Math.abs(e.deltaX) >= ACTION_THRESHOLD && Math.abs(currentX) < ACTION_THRESHOLD) {
          if ('vibrate' in navigator) navigator.vibrate(8);
        }
        x.set(e.deltaX * 0.6);
      },
      onSwipedLeft: (e) => {
        if (Math.abs(e.deltaX) > ACTION_THRESHOLD) onArchive(thread.id);
        x.set(0);
      },
      onSwipedRight: (e) => {
        if (Math.abs(e.deltaX) > ACTION_THRESHOLD) onToggleRead(thread.id, isRead);
        x.set(0);
      },
      onSwiped: () => x.set(0),
      trackMouse: true,
      preventScrollOnSwipe: true,
      delta: 10,
    });
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
        className="relative overflow-hidden mb-1 rounded-m3-lg group"
      >
        <div className="absolute inset-0 flex items-center justify-between px-10 z-0 pointer-events-none">
          <motion.div style={{ opacity: useTransform(x, [0, 80], [0, 1]) }} className="flex items-center gap-3 text-green-600 font-black text-sm uppercase tracking-wider">
            <MailOpen className="h-6 w-6" /> <span>{isRead ? 'Unread' : 'Read'}</span>
          </motion.div>
          <motion.div style={{ opacity: useTransform(x, [0, -80], [0, 1]) }} className="flex items-center gap-3 text-destructive font-black text-sm uppercase tracking-wider">
            <span>Trash</span> <Archive className="h-6 w-6" />
          </motion.div>
        </div>
        <motion.div
          {...handlers}
          style={{ x, scale, opacity }}
          className={cn(
            "relative z-10 flex items-start gap-4 transition-colors border-b border-surface-variant/5 cursor-pointer select-none",
            density === 'compact' ? "p-3" : "p-5",
            isRead ? 'bg-background hover:bg-surface-1' : 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary shadow-sm'
          )}
        >
          <div className="shrink-0 flex flex-col items-center gap-3">
            <Avatar className={cn(density === 'compact' ? "h-10 w-10" : "h-12 w-12")}>
              <AvatarFallback className="bg-primary-container text-primary-on-container font-black text-sm uppercase">
                {thread.participantNames[0]?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleStar(thread.id, thread.isStarred);
                if ('vibrate' in navigator) navigator.vibrate(5);
              }}
              className="p-1 rounded-full hover:bg-surface-variant/30 transition-colors z-20"
            >
              <Star className={cn("h-5 w-5 transition-transform active:scale-150 duration-200", thread.isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-surface-on-variant/30')} />
            </button>
          </div>
          <Link to={`/thread/${thread.id}`} className="flex-1 min-w-0" onClick={(e) => { if (Math.abs(x.get()) > 10) e.preventDefault(); }}>
            <div className="flex items-center justify-between mb-0.5">
              <span className={cn("truncate text-sm tracking-tight", !isRead ? "font-black text-foreground" : "font-bold text-surface-on-variant")}>
                {thread.participantNames.join(', ')}
              </span>
              <span className="text-[11px] font-bold text-surface-on-variant opacity-60">
                {smartFormatDate(thread.lastMessageAt)}
              </span>
            </div>
            <h3 className={cn("truncate text-sm font-bold tracking-tight mb-1", !isRead ? "text-surface-on" : "text-surface-on-variant/80")}>
              {thread.subject}
            </h3>
            <p className="text-xs text-surface-on-variant/60 line-clamp-1 leading-relaxed">
              {thread.snippet}
            </p>
          </Link>
        </motion.div>
      </motion.div>
    );
  }
));
ThreadCard.displayName = 'ThreadCard';