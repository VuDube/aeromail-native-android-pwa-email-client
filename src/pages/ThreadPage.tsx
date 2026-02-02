import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Archive, Trash2, Star, Reply, MoreVertical, Send, Paperclip, Loader2 } from 'lucide-react';
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
  const { data: email, isLoading } = useQuery<Email>({
    queryKey: ['email', id],
    queryFn: () => api<Email>(`/api/emails/${id}`),
    enabled: !!id,
  });
  const markAsReadMutation = useMutation({
    mutationFn: (emailId: string) => 
      api(`/api/emails/${emailId}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
  // Extract variables for useEffect to avoid unnecessary re-runs
  const emailId = email?.id;
  const isRead = email?.isRead;
  const isPending = markAsReadMutation.isPending;
  useEffect(() => {
    if (emailId && isRead === false && !isPending) {
      markAsReadMutation.mutate(emailId);
    }
  }, [emailId, isRead, isPending, markAsReadMutation.mutate]);
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);
  const sendReply = useMutation({
    mutationFn: () => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify({ 
        to: email?.from.email, 
        subject: `Re: ${email?.subject}`, 
        body: replyBody 
      })
    }),
    onSuccess: () => {
      toast.success("Reply sent");
      setReplyBody('');
      setIsReplying(false);
    },
  });
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </AppLayout>
    );
  }
  if (!email) {
    return (
      <AppLayout>
        <div className="p-12 text-center font-bold">Thread not found</div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-surface-2">
              <Archive className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-yellow-100/50">
              <Star className={cn("h-5 w-5 transition-colors", email.isStarred && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar scroll-smooth">
          <motion.h1
            layoutId={`subject-${email.id}`}
            className="text-2xl md:text-3xl font-bold tracking-tight text-surface-on leading-tight"
          >
            {email.subject}
          </motion.h1>
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-1 rounded-m3-xl p-6 shadow-sm border border-surface-variant/20"
            >
              <div className="flex items-center gap-4 mb-8">
                <motion.div layoutId={`avatar-${email.id}`}>
                  <Avatar className="h-12 w-12 border-2 border-primary/10">
                    <AvatarImage src={`https://avatar.vercel.sh/${email.from.email}`} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {email.from.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <motion.span layoutId={`sender-${email.id}`} className="font-bold text-surface-on text-lg">
                      {email.from.name}
                    </motion.span>
                    <span className="text-xs text-surface-on-variant/60 font-medium">
                      {format(email.timestamp, 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-surface-on-variant/80 truncate">
                    to: {email.to.map(t => t.email).join(', ')}
                  </p>
                </div>
              </div>
              <div
                className="prose-email max-w-[65ch] overflow-hidden break-words"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
              />
            </motion.div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-surface-variant/20 bg-background/50 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {isReplying ? (
              <motion.div
                key="reply-box"
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 20 }}
                className="bg-surface-2 rounded-m3-xl p-4 space-y-4 border-2 border-primary/30 shadow-lg"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
                  <Reply className="h-3 w-3" /> Replying to {email.from.name}
                </div>
                <Textarea
                  autoFocus
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply here..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 min-h-[160px] resize-none text-surface-on p-0 leading-relaxed whitespace-pre-wrap"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setIsReplying(false)}>
                      Discard
                    </Button>
                  </div>
                  <Button
                    onClick={() => sendReply.mutate()}
                    disabled={!replyBody.trim() || sendReply.isPending}
                    className="rounded-full gap-2 px-8 h-10 bg-primary text-white shadow-md active:scale-95 transition-transform"
                  >
                    {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reply-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 pb-4"
              >
                <Button
                  onClick={() => setIsReplying(true)}
                  className="flex-1 rounded-full gap-2 h-14 bg-primary-container text-primary-on-container hover:bg-primary-container/80 transition-all font-bold"
                >
                  <Reply className="h-5 w-5" /> Reply
                </Button>
                <Button variant="outline" className="flex-1 rounded-full gap-2 h-14 border-surface-variant hover:bg-surface-1 font-bold">
                  Forward
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}