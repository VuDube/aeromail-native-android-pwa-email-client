import React, { useState, useEffect } from 'react';
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
import { X, Send, Paperclip, CheckCircle, Info, Loader2, Trash2, FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
const composeSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
type ComposeFormValues = z.infer<typeof composeSchema>;
export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chips, setChips] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ id: string, name: string }[]>([]);
  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', subject: '', body: '' }
  });
  const sendEmail = useMutation({
    mutationFn: (data: ComposeFormValues) => api('/api/emails/send', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Message dispatched');
      navigate('/');
    },
  });
  const onSubmit = (data: ComposeFormValues) => sendEmail.mutate(data);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="py-8 md:py-10 lg:py-12 h-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="h-full bg-surface-1 rounded-[40px] shadow-2xl border border-surface-variant/20 flex flex-col overflow-hidden"
          >
            <header className="px-8 py-6 border-b flex items-center justify-between bg-surface-2/30">
              <div className="flex items-center gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full"><X className="h-6 w-6" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                      <AlertDialogDescription>Your draft will be lost forever. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Continue editing</AlertDialogCancel>
                      <AlertDialogAction onClick={() => navigate(-1)} className="rounded-full bg-destructive text-destructive-foreground">Discard draft</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <h2 className="text-2xl font-black tracking-tighter">Compose</h2>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-surface-variant/20"><Paperclip className="h-5 w-5" /></Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={sendEmail.isPending}
                  className="rounded-full bg-primary px-10 h-12 font-black shadow-xl shadow-primary/20 gap-3 transition-transform active:scale-95"
                >
                  {sendEmail.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  Send
                </Button>
              </div>
            </header>
            <form id="compose-form" className="flex-1 p-8 flex flex-col space-y-6 overflow-y-auto custom-scrollbar" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant/20 pb-4 focus-within:border-primary transition-all">
                  <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest w-12 shrink-0">To</span>
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    {chips.map(chip => (
                      <span key={chip} className="m3-chip">
                        {chip}
                        <button type="button" onClick={() => setChips(chips.filter(c => c !== chip))}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <Input 
                      {...form.register('to')} 
                      placeholder="recipient@domain.com" 
                      className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-8 flex-1 min-w-[200px] p-0 placeholder:opacity-40"
                    />
                  </div>
                </div>
                <div className="flex items-center border-b border-surface-variant/20 py-4 focus-within:border-primary transition-all">
                  <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest w-12 shrink-0">Subject</span>
                  <Input 
                    {...form.register('subject')} 
                    placeholder="Enter subject" 
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg font-bold h-8 flex-1 p-0 placeholder:opacity-40" 
                  />
                </div>
              </div>
              <div className="flex-1 pt-4">
                <Textarea
                  {...form.register('body')}
                  placeholder="Share your thoughts..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg leading-relaxed h-full resize-none p-0 placeholder:opacity-30 font-medium"
                />
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 p-4 bg-surface-2 rounded-3xl border border-surface-variant/10">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 bg-background px-4 py-2 rounded-2xl shadow-sm border border-surface-variant/20 group">
                      <FileIcon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold truncate max-w-[150px]">{att.name}</span>
                      <button onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 p-5 bg-primary/5 rounded-3xl text-xs font-bold text-primary/70 border border-primary/10">
                <Info className="h-5 w-5 shrink-0" />
                Drafts are synchronized to your edge instance automatically.
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}