import React, { memo, useState } from 'react';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileIcon, Download, ChevronDown, ChevronUp, FileText, Image as ImageIcon } from 'lucide-react';
interface MessageItemProps {
  msg: Email;
  isLatest: boolean;
  isSameSenderAsPrev: boolean;
}
export const MessageItem = memo(({ msg, isLatest, isSameSenderAsPrev }: MessageItemProps) => {
  const [isExpanded, setIsExpanded] = useState(isLatest);
  const hasHtml = /<[a-z][\s\S]*>/i.test(msg.body);
  const attachments = msg.attachments || [];
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (contentType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };
  return (
    <div className="relative group">
      {!isSameSenderAsPrev && <div className="h-6" />}
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-m3-xl border border-surface-variant/10 transition-all duration-300 overflow-hidden",
          isLatest ? "bg-surface-1 shadow-lg ring-1 ring-primary/5" : "bg-surface-2/60 opacity-90 hover:opacity-100"
        )}
      >
        <div 
          className="p-6 md:p-8 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
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
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-surface-on-variant font-black opacity-40 uppercase tracking-widest">
                      {format(msg.timestamp, 'MMM d, h:mm a')}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
                  </div>
                </div>
                <p className="text-xs text-surface-on-variant opacity-60 font-medium truncate">{msg.from.email}</p>
              </div>
            </div>
          )}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div
                  className={cn(
                    "prose-email text-surface-on text-[15px] leading-[1.6] max-w-none overflow-x-auto custom-scrollbar font-medium",
                    !hasHtml && "whitespace-pre-wrap"
                  )}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }}
                />
                {attachments.length > 0 && (
                  <div className="mt-10 pt-6 border-t border-surface-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-on-variant mb-4 flex items-center gap-2">
                      <FileIcon className="h-3 w-3" /> {attachments.length} Attachments
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {attachments.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-surface-variant/20 hover:bg-surface-3 transition-colors group/file"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {getFileIcon(file.contentType)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate pr-2">{file.filename}</p>
                              <p className="text-[10px] text-surface-on-variant opacity-60 font-black uppercase">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full opacity-0 group-hover/file:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {!isExpanded && !isSameSenderAsPrev && (
            <p className="text-sm text-surface-on-variant opacity-60 line-clamp-1 font-medium italic">
              {msg.snippet}...
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';