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
import { X, Send, Paperclip, CheckCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
const composeSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
type ComposeFormValues = z.infer<typeof composeSchema>;
const SUGGESTIONS = ['alex@example.com', 'support@aeromail.dev', 'team@cloudflare.com', 'marketing@figma.com'];
export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', subject: '', body: '' }
  });
  const toValue = form.watch('to');
  useEffect(() => {
    setShowSuggestions(toValue && toValue.length > 1 && !toValue.includes('@'));
  }, [toValue]);
  const sendEmail = useMutation({
    mutationFn: (data: ComposeFormValues) => api('/api/emails/send', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Message sent successfully');
      navigate('/');
    },
  });
  const onSubmit = (data: ComposeFormValues) => sendEmail.mutate(data);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="py-8 md:py-10 lg:py-12 h-full flex flex-col">
          <motion.div 
            initial={{ y: 30, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className="flex-1 bg-surface-1 rounded-m3-xl shadow-2xl border border-surface-variant/30 flex flex-col overflow-hidden"
          >
            <header className="px-6 py-5 bg-surface-2/50 border-b border-surface-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><X className="h-6 w-6" /></Button>
                <h2 className="text-xl font-bold tracking-tight">New Message</h2>
              </div>
              <div className="flex items-center gap-4">
                <AnimatePresence>
                  {isSaved && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-green-600 flex items-center gap-1 font-bold uppercase">
                      <CheckCircle className="h-3 w-3" /> Draft saved
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
                <Button 
                  type="submit" 
                  form="compose-form" 
                  disabled={sendEmail.isPending}
                  className="rounded-full bg-primary px-8 h-11 font-bold shadow-lg shadow-primary/20 gap-2"
                >
                  {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            </header>
            <form id="compose-form" className="flex-1 p-8 flex flex-col space-y-4 overflow-y-auto" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="relative">
                <div className="flex items-center border-b border-surface-variant/30 py-4 focus-within:border-primary transition-all">
                  <span className="text-sm font-bold text-on-surface-variant w-20">To</span>
                  <Input {...form.register('to')} placeholder="recipient@domain.com" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-auto p-0 placeholder:opacity-50" />
                </div>
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-20 top-14 z-50 bg-surface-1 border border-surface-variant/20 rounded-2xl shadow-2xl p-3 w-72">
                      <p className="text-[10px] font-bold text-on-surface-variant px-3 py-1 uppercase tracking-widest mb-1">Suggestions</p>
                      {SUGGESTIONS.map(s => (
                        <button key={s} type="button" onClick={() => { form.setValue('to', s); setShowSuggestions(false); }} className="w-full text-left px-3 py-2.5 hover:bg-surface-2 rounded-xl text-sm font-medium transition-colors">{s}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center border-b border-surface-variant/30 py-4 focus-within:border-primary transition-all">
                <span className="text-sm font-bold text-on-surface-variant w-20">Subject</span>
                <Input {...form.register('subject')} placeholder="What's this about?" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-auto p-0 placeholder:opacity-50 font-medium" />
              </div>
              <div className="flex-1 pt-6">
                <Textarea
                  {...form.register('body')}
                  placeholder="Write your message..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg leading-relaxed h-full resize-none p-0 placeholder:opacity-30"
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/5 text-primary rounded-2xl text-xs font-medium border border-primary/10">
                <Info className="h-4 w-4 shrink-0" />
                AeroMail supports rich text and markdown rendering for all outgoing messages.
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}