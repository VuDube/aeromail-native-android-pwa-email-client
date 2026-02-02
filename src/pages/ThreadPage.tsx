import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { ArrowLeft, Archive, Trash2, Mail, Star, Reply, MoreVertical } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: email, isLoading } = useQuery<Email>({
    queryKey: ['email', id],
    queryFn: () => api<Email>(`/api/emails/${id}`),
    enabled: !!id,
  });
  const markAsRead = useMutation({
    mutationFn: () => api(`/api/emails/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email', id] });
    }
  });
  const updateEmail = useMutation({
    mutationFn: (updates: Partial<Email>) => api(`/api/emails/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email', id] });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      if (variables.folder === 'trash') {
        toast.success('Moved to trash');
        navigate(-1);
      }
    }
  });
  const { mutate: doMarkAsRead, isPending: isMarkingRead } = markAsRead;
  useEffect(() => {
    if (email && !email.isRead && !isMarkingRead) {
      doMarkAsRead();
    }
  }, [email, isMarkingRead, doMarkAsRead]);
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }
  if (!email) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-on-surface-variant font-medium text-lg">Email not found</p>
          <Button variant="link" onClick={() => navigate(-1)} className="text-primary">Go back</Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <header className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-md py-2 z-10 border-b md:border-none">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-surface-variant">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateEmail.mutate({ folder: 'trash' })}
              className="rounded-full hover:bg-surface-variant"
              title="Archive"
            >
              <Archive className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateEmail.mutate({ folder: 'trash' })}
              className="rounded-full hover:bg-surface-variant"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateEmail.mutate({ isRead: false })}
              className="rounded-full hover:bg-surface-variant"
              title="Mark as unread"
            >
              <Mail className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateEmail.mutate({ isStarred: !email.isStarred })}
              className="rounded-full hover:bg-surface-variant"
            >
              <Star className={cn("h-5 w-5 transition-colors", email.isStarred && "fill-tertiary text-tertiary")} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-surface-variant">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <section className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-medium text-on-surface leading-tight px-2">
            {email.subject}
          </h1>
          <div className="flex items-start gap-4 p-2 rounded-m3-lg bg-surface-1/50">
            <Avatar className="h-12 w-12 border shadow-sm">
              <AvatarImage src={`https://avatar.vercel.sh/${email.from.email}`} />
              <AvatarFallback className="bg-primary-container text-on-primary-container font-bold">
                {email.from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-on-surface">{email.from.name}</span>
                <span className="text-xs text-on-surface-variant">{format(email.timestamp, 'MMM d, yyyy, h:mm a')}</span>
              </div>
              <div className="text-xs text-on-surface-variant flex items-center gap-1">
                to {email.to.map(t => t.name).join(', ')}
              </div>
            </div>
          </div>
          <div
            className="prose-email whitespace-pre-wrap px-2 min-h-[200px]"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
          />
          <div className="pt-8 pb-12 flex gap-3 border-t">
            <Button variant="outline" className="rounded-full gap-2 border-surface-variant bg-transparent px-6">
              <Reply className="h-4 w-4" /> Reply
            </Button>
            <Button variant="outline" className="rounded-full gap-2 border-surface-variant bg-transparent px-6">
              <MoreVertical className="h-4 w-4 rotate-90" /> Forward
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}