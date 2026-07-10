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
  isActive?: boolean;
  onSelect?: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleRead: (id: string, current: boolean) => void;
  onToggleStar: (id: string, current: boolean) => void;
}
export const ThreadCard = React.memo(forwardRef<HTMLDivElement, ThreadCardProps>(
  ({ thread, idx, density, isActive, onSelect, onArchive, onToggleRead, onToggleStar }, ref) => {
    const x = useMotionValue(0);
    const scale = useTransform(x, [-100, 0, 100], [0.98, 1, 0.98]);
    const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
    const isRead = thread.unreadCount === 0;
    const ACTION_THRESHOLD = 120;
    const handlers = useSwipeable({
      onSwiping: (e) => {
        // Prevent accidental triggers during fast scrolling
        if (Math.abs(e.deltaX) < 10) return;
        if (Math.abs(e.deltaX) >= ACTION_THRESHOLD && 'vibrate' in navigator) navigator.vibrate(5);
        x.set(e.deltaX * 0.5);
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
    });
    const handleClick = (e: React.MouseEvent) => {
      if (onSelect) {
        e.preventDefault();
        onSelect(thread.id);
      }
    };
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.02, 0.2) }}
        className="relative overflow-hidden mb-1 rounded-2xl"
      >
        <div className="absolute inset-0 flex items-center justify-between px-8 z-0 pointer-events-none">
          <motion.div style={{ opacity: useTransform(x, [0, 60], [0, 1]) }} className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase">
            <MailOpen className="h-5 w-5" /> <span>{isRead ? 'Unread' : 'Read'}</span>
          </motion.div>
          <motion.div style={{ opacity: useTransform(x, [0, -60], [0, 1]) }} className="flex items-center gap-2 text-destructive font-bold text-xs uppercase">
            <span>Archive</span> <Archive className="h-5 w-5" />
          </motion.div>
        </div>
        <motion.div
          {...handlers}
          style={{ x, scale, opacity }}
          onClick={handleClick}
          className={cn(
            "relative z-10 flex items-start gap-3 transition-all duration-200 border-b border-surface-variant/5 cursor-pointer select-none rounded-2xl",
            density === 'compact' ? "p-2" : "p-4",
            isActive ? "bg-primary-container shadow-sm ring-1 ring-primary/20" : "bg-transparent hover:bg-surface-2",
            !isRead && !isActive && "bg-primary/5 border-l-4 border-l-primary"
          )}
        >
          <div className="shrink-0 flex flex-col items-center gap-2">
            <motion.div layoutId={`avatar-${thread.id}`}>
              <Avatar className={cn(density === 'compact' ? "h-8 w-8" : "h-11 w-11")}>
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                  {thread.participantNames[0]?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(thread.id, thread.isStarred); }}
              className="p-1 rounded-full hover:bg-surface-variant/30 transition-colors"
            >
              <Star className={cn("h-4 w-4", thread.isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-surface-on-variant/20')} />
            </button>
          </div>
          <Link
            to={onSelect ? "#" : `/thread/${thread.id}`}
            className="flex-1 min-w-0"
            onClick={(e) => onSelect && e.preventDefault()}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className={cn("truncate text-sm tracking-tight", !isRead ? "font-black" : "font-bold text-muted-foreground")}>
                {thread.participantNames.join(', ')}
              </span>
              <span className="text-[10px] font-bold opacity-40 shrink-0">
                {smartFormatDate(thread.lastMessageAt)}
              </span>
            </div>
            <motion.h3 layoutId={`subject-${thread.id}`} className={cn("truncate text-sm font-bold tracking-tight mb-1", isRead ? "text-muted-foreground/80" : "text-foreground")}>
              {thread.subject}
            </motion.h3>
            <p className="text-xs text-muted-foreground/60 line-clamp-1 leading-snug">
              {thread.snippet}
            </p>
          </Link>
        </motion.div>
      </motion.div>
    );
  }
));
ThreadCard.displayName = 'ThreadCard';