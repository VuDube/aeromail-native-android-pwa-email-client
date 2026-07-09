import React, { memo } from 'react';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
interface MessageItemProps {
  msg: Email;
  isLatest: boolean;
  isSameSenderAsPrev: boolean;
}
export const MessageItem = memo(({ msg, isLatest, isSameSenderAsPrev }: MessageItemProps) => {
  const hasHtml = /<[a-z][\s\S]*>/i.test(msg.body);
  return (
    <div className="relative group">
      {!isSameSenderAsPrev && <div className="h-6" />}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={cn(
          "rounded-m3-xl p-6 md:p-8 border border-surface-variant/10 transition-all duration-300", 
          isLatest ? "bg-surface-1 shadow-md" : "bg-surface-2/60 opacity-90"
        )}
      >
        {!isSameSenderAsPrev && (
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {msg.from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-surface-on text-base">{msg.from.name}</span>
                <span className="text-[10px] text-surface-on-variant font-black opacity-40 uppercase tracking-widest">
                  {format(msg.timestamp, 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-xs text-surface-on-variant opacity-60 font-medium truncate">{msg.from.email}</p>
            </div>
          </div>
        )}
        <div 
          className={cn(
            "prose-email text-surface-on text-[15px] leading-relaxed max-w-none overflow-x-auto custom-scrollbar", 
            !hasHtml && "whitespace-pre-wrap"
          )} 
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }} 
        />
      </motion.div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';