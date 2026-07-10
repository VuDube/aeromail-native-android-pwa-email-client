import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread, DomainInfo } from '@shared/types';
import { ArrowLeft, Reply, Send, Loader2, ChevronDown, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { MessageItem } from '@/components/email/MessageItem';
import { cn } from '@/lib/utils';
interface ThreadPageProps {
  embeddedId?: string;
  onBack?: () => void;
}
export function ThreadPage({ embeddedId, onBack }: ThreadPageProps) {
  const params = useParams<{ id: string }>();
  const id = embeddedId || params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState('user@aeromail.dev');
  const markAttemptedRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api<DomainInfo[]>('/api/domains')
  });
  const enabledDomains = useMemo(() => domains?.filter(d => d.localEnabled) || [], [domains]);
  const { data: threadData, isLoading, error } = useQuery<{ thread: EmailThread }>({
    queryKey: ['thread', id],
    queryFn: () => api<{ thread: EmailThread }>(`/api/threads/${id}`),
    enabled: !!id
  });
  const thread = threadData?.thread;
  const messages = thread?.messages || [];
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };
  useEffect(() => {
    if (messages.length > 0 || isReplying) {
      const timer = setTimeout(scrollToBottom, 200);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isReplying]);
  const markAsRead = useMutation({
    mutationFn: (threadId: string) => api(`/api/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true })
    }),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.setQueryData(['thread', threadId], (old: any) => {
        if (!old?.thread) return old;
        return { ...old, thread: { ...old.thread, unreadCount: 0 } };
      });
    }
  });
  useEffect(() => {
    if (id && thread && thread.unreadCount > 0 && markAttemptedRef.current !== id) {
      markAttemptedRef.current = id;
      markAsRead.mutate(id);
    }
  }, [id, thread?.unreadCount, thread, markAsRead]);
  useEffect(() => {
    if (enabledDomains.length > 0 && selectedFrom === 'user@aeromail.dev') {
      setSelectedFrom(`hello@${enabledDomains[0].name}`);
    }
  }, [enabledDomains, selectedFrom]);
  const toggleMutation = useMutation({
    mutationFn: (updates: any) => api(`/api/threads/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
    }
  });
  const sendReply = useMutation({
    mutationFn: (body: string) => {
      if (!thread || !messages.length) throw new Error("Conversation state missing");
      const lastMsg = messages[messages.length - 1];
      return api('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          to: [lastMsg.from.email],
          subject: `Re: ${thread.subject}`,
          body: body.trim(),
          threadId: thread.id,
          fromEmail: selectedFrom
        })
      });
    },
    onSuccess: () => {
      toast.success("Reply sent");
      setReplyBody('');
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send")
  });
  const content = (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full px-4 lg:px-8 pb-32">
          <header className="sticky top-0 bg-background/80 backdrop-blur-xl z-[20] py-4 flex items-center justify-between border-b border-surface-variant/10 mb-8">
            <div className="flex items-center gap-2 min-w-0">
              {(onBack || !embeddedId) && (
                <Button variant="ghost" size="icon" onClick={() => (onBack ? onBack() : navigate(-1))} className="rounded-full shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-xl lg:text-2xl font-black tracking-tight truncate">{thread?.subject}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ isStarred: !thread?.isStarred })} className="rounded-full">
                <Star className={cn("h-5 w-5", thread?.isStarred && "fill-yellow-500 text-yellow-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { toggleMutation.mutate({ folder: 'trash' }); if(onBack) onBack(); else navigate(-1); }} className="rounded-full">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          </header>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                isLatest={idx === messages.length - 1}
                isSameSenderAsPrev={idx > 0 && messages[idx-1].from.email === msg.from.email}
              />
            ))}
            <div ref={messagesEndRef} className="h-px w-full" />
          </div>
        </div>
      </div>
      <div className={cn(
        "shrink-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 border-t border-surface-variant/5",
        embeddedId ? "w-full" : "w-full"
      )}>
        <div className="max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {isReplying ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-surface-1 shadow-2xl rounded-m3-xl border border-primary/20 overflow-hidden flex flex-col">
                <div className="px-6 py-3 border-b flex items-center justify-between bg-surface-2/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">From</span>
                    <Select value={selectedFrom} onValueChange={setSelectedFrom}>
                      <SelectTrigger className="h-8 border-none bg-surface-3/50 px-3 rounded-lg text-xs font-bold focus:ring-0 w-auto"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-m3-lg">
                        <SelectItem value="user@aeromail.dev" className="text-xs font-bold">user@aeromail.dev</SelectItem>
                        {enabledDomains.map(d => (
                          <SelectItem key={d.id} value={`hello@${d.name}`} className="text-xs font-bold">hello@{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="rounded-full"><ChevronDown className="h-4 w-4" /></Button>
                </div>
                <div className="p-6">
                  <Textarea
                    autoFocus
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply..."
                    className="min-h-[120px] bg-transparent border-none focus-visible:ring-0 text-base p-0 resize-none shadow-none"
                  />
                </div>
                <div className="px-6 py-3 border-t flex items-center justify-end bg-surface-2/30 gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)} className="rounded-full font-bold">Discard</Button>
                  <Button size="sm" onClick={() => sendReply.mutate(replyBody)} disabled={!replyBody.trim() || sendReply.isPending} className="rounded-full px-8 bg-primary text-white font-bold h-10">
                    {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Send
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setIsReplying(true)} className="w-full rounded-full h-14 bg-primary text-white font-bold text-base shadow-xl shadow-primary/20 gap-3"><Reply className="h-5 w-5" /> Quick Reply</Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
  if (embeddedId) return content;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 min-h-screen flex flex-col">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-primary/20 h-10 w-10" /></div>
          ) : error || !thread ? (
            <div className="max-w-md mx-auto py-20 text-center space-y-6">
               <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mx-auto"><ArrowLeft className="h-8 w-8" /></div>
               <h2 className="text-2xl font-black">Message not found</h2>
               <Button onClick={() => navigate('/')} className="rounded-full">Back to Inbox</Button>
            </div>
          ) : content}
        </div>
      </div>
    </AppLayout>
  );
}