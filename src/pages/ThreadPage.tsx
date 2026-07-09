import React, { useEffect, memo, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email, EmailThread, DomainInfo } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Reply, Send, Loader2, ChevronDown } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
const MessageCard = memo(({ msg, isLatest, isSameSenderAsPrev }: { msg: Email, isLatest: boolean, isSameSenderAsPrev: boolean }) => {
  const hasHtml = /<[a-z][\s\S]*>/i.test(msg.body);
  return (
    <div className="relative group">
      {!isSameSenderAsPrev && <div className="h-6" />}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-m3-xl p-8 border border-surface-variant/10 transition-all duration-300", isLatest ? "bg-surface-1 shadow-md" : "bg-surface-2/60 opacity-90")}>
        {!isSameSenderAsPrev && (
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              <AvatarImage src={`https://avatar.vercel.sh/${msg.from.email}`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{msg.from.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-surface-on text-base">{msg.from.name}</span>
                <span className="text-[10px] text-surface-on-variant font-black opacity-40 uppercase tracking-widest">{format(msg.timestamp, 'MMM d, h:mm a')}</span>
              </div>
              <p className="text-xs text-surface-on-variant opacity-60 font-medium truncate">{msg.from.email}</p>
            </div>
          </div>
        )}
        <div className={cn("prose-email text-surface-on text-[15px] leading-relaxed max-w-none", !hasHtml && "whitespace-pre-wrap")} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body) }} />
      </motion.div>
    </div>
  );
});
MessageCard.displayName = 'MessageCard';
export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState('user@aeromail.dev');
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: () => api<DomainInfo[]>('/api/domains') });
  const enabledDomains = useMemo(() => domains?.filter(d => d.localEnabled) || [], [domains]);
  const { data: threadData, isLoading } = useQuery<{ thread: EmailThread }>({
    queryKey: ['thread', id],
    queryFn: () => api<{ thread: EmailThread }>(`/api/threads/${id}`),
    enabled: !!id
  });
  const thread = threadData?.thread;
  const messages = thread?.messages || [];
  const markAsRead = useMutation({
    mutationFn: () => api(`/api/threads/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
    }
  });
  // Optimized side-effect to mark as read only when necessary
  useEffect(() => {
    if (id && thread && thread.unreadCount > 0) {
      markAsRead.mutate();
    }
  }, [id, thread?.unreadCount, markAsRead]);
  useEffect(() => {
    if (enabledDomains.length > 0 && selectedFrom === 'user@aeromail.dev') {
      setSelectedFrom(`hello@${enabledDomains[0].name}`);
    }
  }, [enabledDomains, selectedFrom]);
  const sendReply = useMutation({
    mutationFn: (body: string) => {
      if (!thread || !messages.length) throw new Error("Thread not loaded");
      return api('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          to: messages[messages.length - 1].from.email,
          subject: `Re: ${thread.subject}`,
          body,
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
    },
  });
  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center py-40"><Loader2 className="animate-spin text-primary/20 h-10 w-10" /></div></AppLayout>;
  if (!thread) return <AppLayout><div className="max-w-7xl mx-auto px-4 py-20 text-center"><h2 className="text-2xl font-black mb-4">Not found</h2><Button onClick={() => navigate('/')}>Back</Button></div></AppLayout>;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="max-w-4xl mx-auto w-full pb-64">
            <header className="sticky top-0 bg-background/80 backdrop-blur-xl z-[20] py-4 flex items-center justify-between border-b border-surface-variant/10 mb-10">
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
                <h1 className="text-2xl font-black tracking-tight truncate">{thread.subject}</h1>
              </div>
            </header>
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <MessageCard
                  key={msg.id}
                  msg={msg}
                  isLatest={idx === messages.length - 1}
                  isSameSenderAsPrev={idx > 0 && messages[idx-1].from.email === msg.from.email}
                />
              ))}
            </div>
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-6 z-[40] bg-gradient-to-t from-background via-background/95 to-transparent pt-20">
              <div className="max-w-4xl mx-auto px-4 md:px-8">
                <AnimatePresence mode="wait">
                  {isReplying ? (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-surface-1 shadow-2xl rounded-m3-xl border border-primary/20 overflow-hidden max-h-[60vh] flex flex-col">
                      <div className="px-8 py-4 border-b flex items-center justify-between bg-surface-2/50 shrink-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">From</span>
                          <Select value={selectedFrom} onValueChange={setSelectedFrom}>
                            <SelectTrigger className="h-8 border-none bg-surface-3/50 px-3 rounded-lg text-xs font-bold focus:ring-0 w-auto min-w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-m3-lg">
                              <SelectItem value="user@aeromail.dev" className="text-xs font-bold">user@aeromail.dev</SelectItem>
                              {enabledDomains.map(d => (
                                <SelectItem key={d.id} value={`hello@${d.name}`} className="text-xs font-bold">hello@{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsReplying(false)} className="h-8 w-8 rounded-full"><ChevronDown className="h-5 w-5" /></Button>
                      </div>
                      <div className="p-8 flex-1 overflow-y-auto">
                        <Textarea autoFocus value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your message..." className="min-h-[150px] bg-transparent border-none focus-visible:ring-0 text-base p-0 resize-none" />
                      </div>
                      <div className="px-8 py-4 border-t flex items-center justify-end bg-surface-2/30 gap-4 shrink-0">
                        <Button variant="ghost" onClick={() => setIsReplying(false)} className="rounded-full font-bold">Discard</Button>
                        <Button onClick={() => sendReply.mutate(replyBody)} disabled={!replyBody.trim() || sendReply.isPending} className="rounded-full px-10 bg-primary text-white font-bold gap-2 shadow-lg h-11">
                          {sendReply.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Send
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex gap-4">
                      <Button onClick={() => setIsReplying(true)} className="flex-1 rounded-full h-16 bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 gap-3"><Reply className="h-6 w-6" /> Reply</Button>
                      <Button variant="outline" className="flex-1 rounded-full h-16 border-surface-variant font-bold text-lg bg-surface-1 shadow-sm">Forward</Button>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}