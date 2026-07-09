import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email, EmailThread } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Archive, Trash2, Star, Reply, MoreVertical, Send, Paperclip, Loader2, ChevronDown, Bold, Italic, Link as LinkIcon, Type } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = React.useState('');
  const [isReplying, setIsReplying] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: emailData, isLoading: isEmailLoading } = useQuery<Email & { thread: EmailThread }>({
    queryKey: ['email', id],
    queryFn: () => api<Email & { thread: EmailThread }>(`/api/emails/${id}`),
    enabled: !!id,
  });
  const thread = emailData?.thread;
  const messages = thread?.messages || [];
  const markThreadAsRead = useMutation({
    mutationFn: (threadId: string) => api(`/api/threads/${threadId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['email', id] });
    },
  });
  useEffect(() => {
    if (thread?.id && thread.unreadCount > 0 && !markThreadAsRead.isPending) {
      markThreadAsRead.mutate(thread.id);
    }
  }, [thread?.id, thread?.unreadCount, markThreadAsRead]);
  const sendReply = useMutation({
    mutationFn: ({ to, subject, body, threadId }: { to: string; subject: string; body: string; threadId: string }) =>
      api('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({ to, subject, body, threadId })
      }),
    onSuccess: () => {
      toast.success("Reply sent");
      setReplyBody('');
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ['email', id] });
    },
  });
  if (isEmailLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center py-40">
          <Loader2 className="animate-spin text-primary h-12 w-12 opacity-20" />
        </div>
      </AppLayout>
    );
  }
  if (!emailData || !thread) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-black mb-4 tracking-tighter">Conversation Disconnected</h2>
          <Button onClick={() => navigate('/')} className="rounded-full px-8">Return to Inbox</Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-12 pb-40">
          <header className="sticky top-0 bg-background/80 backdrop-blur-xl z-30 py-4 flex items-center justify-between border-b border-surface-variant/10">
            <div className="flex items-center gap-4 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl font-black tracking-tighter truncate">{thread.subject}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="rounded-full"><Archive className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Star className={cn("h-5 w-5", thread.isStarred && "fill-yellow-500 text-yellow-500")} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-5 w-5" /></Button>
            </div>
          </header>
          <div className="space-y-4 relative">
            {messages.map((msg, idx) => {
              const isSameSenderAsPrev = idx > 0 && messages[idx-1].from.email === msg.from.email;
              const isLatest = idx === messages.length - 1;
              return (
                <div key={msg.id} className="relative group">
                  {!isSameSenderAsPrev && idx !== 0 && <div className="h-4" />}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "rounded-[32px] p-6 transition-all duration-300 border border-surface-variant/10",
                      isLatest ? "bg-surface-1 shadow-xl ring-2 ring-primary/10" : "bg-surface-2 opacity-90 scale-[0.98]"
                    )}
                  >
                    {!isSameSenderAsPrev && (
                      <div className="flex items-center gap-4 mb-6">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-black text-xl">
                            {msg.from.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-on-surface text-lg leading-none">{msg.from.name}</span>
                            <span className="text-xs text-on-surface-variant font-bold opacity-60">
                              {format(msg.timestamp, 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant font-bold opacity-40 mt-1 truncate">
                            {msg.from.email}
                          </p>
                        </div>
                      </div>
                    )}
                    <div
                      className="prose-email text-on-surface text-base"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }}
                    />
                  </motion.div>
                </div>
              );
            })}
          </div>
          <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-6 z-40">
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="wait">
                {isReplying ? (
                  <motion.div
                    key="reply-card"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="bg-surface shadow-2xl rounded-[32px] border-2 border-primary/20 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-surface-1">
                      <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
                        <Reply className="h-4 w-4" /> Drafting Reply
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="rounded-full h-8 w-8">
                        <ChevronDown className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-4 mb-4 opacity-50">
                        <Bold className="h-4 w-4" /> <Italic className="h-4 w-4" /> <LinkIcon className="h-4 w-4" /> <Type className="h-4 w-4" />
                      </div>
                      <Textarea
                        autoFocus
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write your message here..."
                        className="min-h-[200px] bg-transparent border-none focus-visible:ring-0 text-lg p-0 resize-none font-medium leading-relaxed"
                      />
                    </div>
                    <div className="px-6 py-4 border-t flex items-center justify-between bg-surface-1">
                      <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
                      <Button
                        onClick={() => sendReply.mutate({
                          to: messages[messages.length - 1].from.email,
                          subject: `Re: ${thread.subject}`,
                          body: replyBody,
                          threadId: thread.id
                        })}
                        disabled={!replyBody.trim() || sendReply.isPending}
                        className="rounded-full px-8 h-12 bg-primary text-white font-black shadow-lg shadow-primary/20 gap-2"
                      >
                        {sendReply.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        Send Reply
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setIsReplying(true)}
                      className="flex-1 rounded-full h-16 bg-primary text-white font-black text-xl shadow-2xl shadow-primary/30 gap-4"
                    >
                      <Reply className="h-6 w-6" /> Reply
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-full h-16 border-surface-variant font-black text-xl bg-surface-1 shadow-sm">
                      Forward
                    </Button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}