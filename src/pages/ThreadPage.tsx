import React, { useEffect, useCallback } from 'react';
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
  // Fetch the specific email to get context (threadId)
  const { data: emailData, isLoading: isEmailLoading } = useQuery<Email & { thread: EmailThread }>({
    queryKey: ['email', id],
    queryFn: () => api<Email & { thread: EmailThread }>(`/api/emails/${id}`),
    enabled: !!id,
  });
  const thread = emailData?.thread;
  const messages = thread?.messages || [];
  const markThreadAsRead = useMutation({
    mutationFn: (threadId: string) =>
      api(`/api/threads/${threadId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['email', id] });
    },
  });
  useEffect(() => {
    if (thread?.id && thread.unreadCount > 0) {
      markThreadAsRead.mutate(thread.id);
    }
  }, [thread?.id, thread?.unreadCount]);
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);
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
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </AppLayout>
    );
  }
  if (!emailData || !thread) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <h2 className="text-xl font-bold mb-2">Conversation not found</h2>
          <Button onClick={() => navigate('/')}>Back to Inbox</Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{thread.subject}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-surface-2">
              <Archive className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Star className={cn("h-5 w-5", thread.isStarred && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar scroll-smooth pb-32">
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "bg-surface-1 rounded-m3-lg p-5 border border-surface-variant/20 shadow-sm",
                idx === messages.length - 1 ? "ring-2 ring-primary/10" : "opacity-90"
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {msg.from.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-surface-on truncate">{msg.from.name}</span>
                    <span className="text-[10px] text-surface-on-variant font-medium">
                      {format(msg.timestamp, 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-[10px] text-surface-on-variant truncate">
                    to: {msg.to.map(t => t.email).join(', ')}
                  </p>
                </div>
              </div>
              <div
                className="prose-email text-sm text-surface-on leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }}
              />
            </motion.div>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 md:relative md:mt-4 p-4 bg-background/80 backdrop-blur-md border-t md:border-none">
          <AnimatePresence mode="wait">
            {isReplying ? (
              <motion.div
                key="reply-box"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-surface-2 rounded-m3-xl p-4 space-y-4 border-2 border-primary/30 shadow-2xl"
              >
                <div className="flex items-center justify-between text-xs font-bold text-primary">
                  <div className="flex items-center gap-2"><Reply className="h-3 w-3" /> Replying to {messages[messages.length - 1]?.from.name}</div>
                  <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="h-6 w-6 rounded-full"><ChevronDown className="h-4 w-4" /></Button>
                </div>
                <Textarea
                  autoFocus
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 min-h-[120px] resize-none text-surface-on p-0"
                />
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
                  <Button
                    onClick={() => sendReply.mutate({
                      to: messages[messages.length - 1].from.email,
                      subject: `Re: ${thread.subject}`,
                      body: replyBody,
                      threadId: thread.id
                    })}
                    disabled={!replyBody.trim() || sendReply.isPending}
                    className="rounded-full gap-2 px-6 h-10 bg-primary text-white"
                  >
                    {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="flex gap-3 max-w-4xl mx-auto">
                <Button
                  onClick={() => setIsReplying(true)}
                  className="flex-1 rounded-full gap-2 h-12 bg-primary-container text-primary-on-container font-bold"
                >
                  <Reply className="h-4 w-4" /> Reply
                </Button>
                <Button variant="outline" className="flex-1 rounded-full h-12 border-surface-variant font-bold">
                  Forward
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}