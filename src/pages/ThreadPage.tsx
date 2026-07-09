import React, { useEffect, memo } from 'react';
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
const MessageCard = memo(({ msg, isLatest, isSameSenderAsPrev }: { msg: Email, isLatest: boolean, isSameSenderAsPrev: boolean }) => (
  <div className="relative group">
    {!isSameSenderAsPrev && <div className="h-4" />}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[28px] p-6 border border-surface-variant/10",
        isLatest ? "bg-surface-1 shadow-md" : "bg-surface-2 opacity-90"
      )}
    >
      {!isSameSenderAsPrev && (
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-10 w-10 border border-background shadow-sm">
            <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {msg.from.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-surface-on">{msg.from.name}</span>
              <span className="text-[10px] text-surface-on-variant font-bold opacity-60 uppercase tracking-tighter">
                {format(msg.timestamp, 'MMM d, h:mm a')}
              </span>
            </div>
            <p className="text-[10px] text-surface-on-variant opacity-40 font-bold truncate">
              {msg.from.email}
            </p>
          </div>
        </div>
      )}
      <div
        className="prose-email text-surface-on text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }}
      />
    </motion.div>
  </div>
));
MessageCard.displayName = 'MessageCard';
export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = React.useState('');
  const [isReplying, setIsReplying] = React.useState(false);
  const { data: threadData, isLoading } = useQuery<Email & { thread: EmailThread }>(({
    queryKey: ['thread', id],
    queryFn: () => api<Email & { thread: EmailThread }>(`/api/threads/${id}`),
    enabled: !!id,
  }));
  const thread = threadData?.thread;
  const messages = thread?.messages || [];
  const markAsRead = useMutation(({
    mutationFn: (tid: string) => api(`/api/threads/${tid}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
    },
  }));
  useEffect(() => {
    if (thread?.id && thread.unreadCount > 0) {
      markAsRead.mutate(thread.id);
    }
  }, [thread?.id, thread?.unreadCount, markAsRead]);
  const sendReply = useMutation(({
    mutationFn: (body: string) => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify({
        to: messages[messages.length - 1]?.from.email,
        subject: `Re: ${thread?.subject}`,
        body,
        threadId: thread?.id
      })
    }),
    onSuccess: () => {
      toast.success("Sent");
      setReplyBody('');
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
    },
  }));
  if (isLoading) return (
    <AppLayout>
      <div className="flex h-full items-center justify-center py-40">
        <Loader2 className="animate-spin text-primary/20 h-10 w-10" />
      </div>
    </AppLayout>
  );
  if (!thread) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-black mb-4">Conversation not found</h2>
        <Button onClick={() => navigate('/')} className="rounded-full">Back to Inbox</Button>
      </div>
    </AppLayout>
  );
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-40">
        <header className="sticky top-0 bg-background/90 backdrop-blur-md z-30 py-4 flex items-center justify-between border-b border-surface-variant/10 mb-8">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-black tracking-tight truncate">{thread.subject}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full"><Archive className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><Trash2 className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Star className={cn("h-5 w-5", thread.isStarred && "fill-yellow-500 text-yellow-500")} />
            </Button>
          </div>
        </header>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              isLatest={idx === messages.length - 1}
              isSameSenderAsPrev={idx > 0 && messages[idx-1].from.email === msg.from.email}
            />
          ))}
        </div>
        <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-6 z-40 bg-gradient-to-t from-background via-background to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {isReplying ? (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="bg-surface shadow-2xl rounded-3xl border-2 border-primary/10 overflow-hidden"
                >
                  <div className="px-6 py-3 border-b flex items-center justify-between bg-surface-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Drafting Reply</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="h-8 w-8 rounded-full">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-6">
                    <Textarea
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[150px] bg-transparent border-none focus-visible:ring-0 text-base p-0 resize-none"
                    />
                  </div>
                  <div className="px-6 py-4 border-t flex items-center justify-end bg-surface-1">
                    <Button
                      onClick={() => sendReply.mutate(replyBody)}
                      disabled={!replyBody.trim() || sendReply.isPending}
                      className="rounded-full px-8 bg-primary text-white font-bold gap-2"
                    >
                      {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsReplying(true)}
                    className="flex-1 rounded-full h-14 bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 gap-3"
                  >
                    <Reply className="h-5 w-5" /> Reply
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-full h-14 border-surface-variant font-bold text-lg bg-surface-1 shadow-sm">
                    Forward
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}