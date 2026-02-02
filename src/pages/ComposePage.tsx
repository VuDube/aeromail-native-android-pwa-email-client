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
import { X, Send, Paperclip, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
const composeSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
type ComposeFormValues = z.infer<typeof composeSchema>;
const SUGGESTIONS = [
  'alex@example.com', 'support@aeromail.dev', 'marketing@gmail.com', 'team@cloudflare.com'
];
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
    if (toValue && toValue.length > 1 && !toValue.includes('@')) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [toValue]);
  // Simulate Auto-save
  useEffect(() => {
    if (form.formState.isDirty) {
      const timer = setTimeout(() => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [form.watch('body'), form.watch('subject')]);
  const sendEmail = useMutation({
    mutationFn: (data: ComposeFormValues) => api('/api/emails/send', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Message sent');
      navigate('/');
    },
  });
  const onSubmit = (data: ComposeFormValues) => sendEmail.mutate(data);
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 h-full flex flex-col">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 bg-surface-1 rounded-m3-xl shadow-2xl flex flex-col overflow-hidden border border-surface-variant">
          <header className="px-6 py-4 bg-surface-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><X className="h-6 w-6" /></Button>
              <h2 className="text-xl font-bold">Compose</h2>
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {isSaved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-green-600 flex items-center gap-1 font-medium">
                    <CheckCircle className="h-3 w-3" /> Draft saved
                  </motion.span>
                )}
              </AnimatePresence>
              <Button variant="ghost" size="icon" className="rounded-full"><Paperclip className="h-5 w-5" /></Button>
              <Button onClick={form.handleSubmit(onSubmit)} className="rounded-full bg-primary px-8 shadow-lg shadow-primary/20 gap-2">
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </header>
          <form className="flex-1 p-6 flex flex-col space-y-2 overflow-y-auto" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="relative">
              <div className="flex items-center border-b border-surface-variant py-3 focus-within:border-primary transition-colors">
                <span className="text-sm font-bold text-on-surface-variant w-14">To</span>
                <Input {...form.register('to')} placeholder="name@email.com" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0" />
              </div>
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-14 top-12 z-50 bg-surface-1 border rounded-xl shadow-xl p-2 w-64">
                    <p className="text-[10px] font-bold text-on-surface-variant px-3 py-1 uppercase tracking-wider">Suggested</p>
                    {SUGGESTIONS.map(s => (
                      <button key={s} type="button" onClick={() => { form.setValue('to', s); setShowSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-2 rounded-lg text-sm transition-colors">{s}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center border-b border-surface-variant py-3 focus-within:border-primary transition-colors">
              <span className="text-sm font-bold text-on-surface-variant w-14">Subject</span>
              <Input {...form.register('subject')} placeholder="What is this about?" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0" />
            </div>
            <div className="flex-1 pt-4">
              <Textarea 
                {...form.register('body')} 
                placeholder="Write your message here..." 
                className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full resize-none p-0"
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs">
              <Info className="h-4 w-4" />
              Markdown and rich text rendering is supported in the recipient's view.
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}