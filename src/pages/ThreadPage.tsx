import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Archive, Trash2, Mail, Star, Reply, MoreVertical, Send, Paperclip } from 'lucide-react';
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
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const { data: email, isLoading } = useQuery<Email>({
    queryKey: ['email', id],
    queryFn: () => api<Email>(`/api/emails/${id}`),
    enabled: !!id,
  });
  const markAsRead = useMutation({
    mutationFn: () => api(`/api/emails/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });
  useEffect(() => {
    if (email && !email.isRead) markAsRead.mutate();
  }, [email?.id]);
  const sendReply = useMutation({
    mutationFn: () => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify({ to: email?.from.email, subject: `Re: ${email?.subject}`, body: replyBody })
    }),
    onSuccess: () => {
      toast.success("Reply sent");
      setReplyBody('');
      setIsReplying(false);
    }
  });
  if (isLoading) return <AppLayout><div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div></AppLayout>;
  if (!email) return <AppLayout><div className="p-12 text-center">Thread not found</div></AppLayout>;
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 lg:py-12 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full"><Archive className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><Trash2 className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><Star className={cn("h-5 w-5", email.isStarred && "fill-yellow-400 text-yellow-400")} /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-5 w-5" /></Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
          <motion.h1 layoutId={`title-${email.id}`} className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
            {email.subject}
          </motion.h1>
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-1 rounded-m3-xl p-6 shadow-sm border border-surface-variant">
              <div className="flex items-center gap-4 mb-6">
                <motion.div layoutId={`avatar-${email.id}`}>
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={`https://avatar.vercel.sh/${email.from.email}`} />
                    <AvatarFallback className="bg-primary-container text-on-primary-container font-bold">
                      {email.from.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{email.from.name}</span>
                    <span className="text-xs text-on-surface-variant">{format(email.timestamp, 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">To: {email.to.map(t => t.email).join(', ')}</p>
                </div>
              </div>
              <div className="prose-email" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }} />
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          <div className="mt-6">
            {isReplying ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-surface-2 rounded-m3-lg p-4 space-y-3 border-2 border-primary/20">
                <Textarea 
                  autoFocus
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${email.from.name}...`}
                  className="bg-transparent border-none focus-visible:ring-0 min-h-[120px] resize-none"
                />
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setIsReplying(false)}>Cancel</Button>
                    <Button onClick={() => sendReply.mutate()} disabled={!replyBody.trim()} className="rounded-full gap-2 px-6">
                      <Send className="h-4 w-4" /> Send
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex gap-4">
                <Button onClick={() => setIsReplying(true)} className="flex-1 rounded-full gap-2 h-12 bg-primary-container text-on-primary-container hover:bg-primary/10">
                  <Reply className="h-5 w-5" /> Reply
                </Button>
                <Button variant="outline" className="flex-1 rounded-full gap-2 h-12 border-surface-variant">
                  Forward
                </Button>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
function Loader2(props: any) {
  return <div {...props} className={cn("animate-spin rounded-full h-8 w-8 border-b-2 border-primary", props.className)} />;
}