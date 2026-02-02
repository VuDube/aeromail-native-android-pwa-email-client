import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
const composeSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
type ComposeFormValues = z.infer<typeof composeSchema>;
export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', subject: '', body: '' }
  });
  const sendEmail = useMutation({
    mutationFn: (data: ComposeFormValues) => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Message sent');
      navigate('/');
    },
    onError: (err) => {
      toast.error('Failed to send: ' + (err as Error).message);
    }
  });
  const onSubmit = (data: ComposeFormValues) => {
    sendEmail.mutate(data);
  };
  const handleDiscard = () => {
    if (form.formState.isDirty) {
      if (confirm('Discard draft?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <div className="bg-surface-1 rounded-m3-xl shadow-xl overflow-hidden border border-surface-variant">
          <header className="px-4 py-3 flex items-center justify-between bg-surface-2 border-b">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleDiscard} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
              <h1 className="font-medium">Compose</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={sendEmail.isPending}
                className="rounded-full bg-primary text-primary-foreground px-6 gap-2"
              >
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </header>
          <form className="p-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 border-b border-surface-variant pb-1">
                <span className="text-on-surface-variant text-sm w-12">To</span>
                <Input 
                  {...form.register('to')}
                  placeholder="Recipients"
                  className="border-none bg-transparent focus-visible:ring-0 h-9 p-0 shadow-none"
                />
              </div>
              {form.formState.errors.to && (
                <p className="text-destructive text-[10px] pl-14">{form.formState.errors.to.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 border-b border-surface-variant pb-1">
                <span className="text-on-surface-variant text-sm w-12">Subject</span>
                <Input 
                  {...form.register('subject')}
                  placeholder="Add a subject"
                  className="border-none bg-transparent focus-visible:ring-0 h-9 p-0 shadow-none"
                />
              </div>
              {form.formState.errors.subject && (
                <p className="text-destructive text-[10px] pl-14">{form.formState.errors.subject.message}</p>
              )}
            </div>
            <div className="pt-2">
              <Textarea 
                {...form.register('body')}
                placeholder="Compose email"
                className="min-h-[400px] border-none bg-transparent focus-visible:ring-0 p-0 shadow-none resize-none leading-relaxed"
              />
              {form.formState.errors.body && (
                <p className="text-destructive text-[10px]">{form.formState.errors.body.message}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}