import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email, EmailThread } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Archive, Trash2, Star, Reply, MoreVertical, Send, Paperclip, Loader2, ChevronDown } from 'lucide-react';
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
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  if (isEmailLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary h-12 w-12 opacity-20" />
        </div>
      </AppLayout>
    );
  }
  if (!emailData || !thread) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Conversation not found</h2>
          <Button onClick={() => navigate('/')} className="rounded-full">Back to Inbox</Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
        <div className="py-8 md:py-10 lg:py-12 flex flex-col h-full overflow-hidden">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl font-bold text-on-surface truncate leading-tight">{thread.subject}</h1>
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
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-40">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "bg-surface-1 rounded-m3-xl p-6 border border-surface-variant/20 shadow-sm",
                  idx === messages.length - 1 ? "ring-2 ring-primary/20" : "opacity-95"
                )}
              >
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {msg.from.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface text-base">{msg.from.name}</span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        {format(msg.timestamp, 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate opacity-70">
                      to: {msg.to.map(t => t.email).join(', ')}
                    </p>
                  </div>
                </div>
                <div
                  className="prose-email text-sm text-on-surface leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }}
                />
              </motion.div>
            ))}
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-background/90 backdrop-blur-xl border-t md:border-none z-40">
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="wait">
                {isReplying ? (
                  <motion.div
                    key="reply-box"
                    initial={{ height: 0, opacity: 0, y: 20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: 20 }}
                    className="bg-surface-2 rounded-m3-xl p-5 space-y-4 border-2 border-primary/40 shadow-2xl"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-primary uppercase tracking-widest">
                      <div className="flex items-center gap-2"><Reply className="h-4 w-4" /> Replying...</div>
                      <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="h-7 w-7 rounded-full"><ChevronDown className="h-5 w-5" /></Button>
                    </div>
                    <Textarea
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your message..."
                      className="bg-transparent border-none shadow-none focus-visible:ring-0 min-h-[160px] resize-none text-on-surface text-base p-0"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-surface-variant/20">
                      <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
                      <Button
                        onClick={() => sendReply.mutate({
                          to: messages[messages.length - 1].from.email,
                          subject: `Re: ${thread.subject}`,
                          body: replyBody,
                          threadId: thread.id
                        })}
                        disabled={!replyBody.trim() || sendReply.isPending}
                        className="rounded-full gap-2 px-8 h-12 bg-primary text-white font-bold"
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
                      className="flex-1 rounded-full gap-3 h-14 bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20"
                    >
                      <Reply className="h-5 w-5" /> Reply
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-full h-14 border-surface-variant font-bold text-lg bg-surface-1">
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