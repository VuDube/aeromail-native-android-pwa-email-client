import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { X, Send, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_USERS } from '@shared/mock-data';
const composeSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(composeSchema),
    defaultValues: { subject: '', body: '' }
  });
  const sendEmail = useMutation({
    mutationFn: (data: any) => api('/api/emails/send', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Message sent successfully');
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });
  const addRecipient = useCallback((email: string) => {
    const trimmed = email.trim().replace(',', '');
    if (trimmed && !recipients.includes(trimmed) && /^\S+@\S+\.\S+$/.test(trimmed)) {
      setRecipients(prev => [...prev, trimmed]);
      setRecipientInput('');
      setShowSuggestions(false);
    } else if (trimmed) {
      toast.error("Please enter a valid email address");
    }
  }, [recipients]);
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const onSubmit = (data: any) => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    sendEmail.mutate({ ...data, to: recipients[0] });
  };
  const suggestions = MOCK_USERS.filter(u =>
    u.email.toLowerCase().includes(recipientInput.toLowerCase()) ||
    u.name.toLowerCase().includes(recipientInput.toLowerCase())
  ).slice(0, 3);
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-surface-1 rounded-m3-xl shadow-2xl border border-surface-variant/20 flex flex-col overflow-hidden min-h-[70vh]"
          >
            <header className="px-8 py-6 border-b flex items-center justify-between bg-surface-2/30 shrink-0">
              <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-surface-variant/20">
                  <X className="h-6 w-6" />
                </Button>
                <h2 className="text-2xl font-black tracking-tight text-surface-on">New Message</h2>
              </div>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={sendEmail.isPending}
                className="rounded-full bg-primary px-10 h-12 font-bold shadow-lg shadow-primary/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {sendEmail.isPending ? (
                    <motion.div key="loader" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Send className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
                Send
              </Button>
            </header>
            <form className="flex-1 p-8 md:p-12 flex flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6 relative shrink-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant/20 pb-4 min-h-[56px]">
                  <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">To</span>
                  {recipients.map(r => (
                    <span key={r} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold transition-all border border-primary/10 group">
                      {r}
                      <button type="button" onClick={() => removeRecipient(r)} className="hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
                    </span>
                  ))}
                  <div className="flex-1 relative">
                    <Input
                      value={recipientInput}
                      onChange={(e) => { setRecipientInput(e.target.value); setShowSuggestions(true); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addRecipient(recipientInput);
                        }
                      }}
                      placeholder={recipients.length === 0 ? "Enter recipient email..." : ""}
                      className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-10 p-0 font-medium"
                    />
                    {showSuggestions && recipientInput && suggestions.length > 0 && (
                      <div ref={suggestionRef} className="absolute top-full left-0 w-72 bg-surface border border-surface-variant/20 shadow-2xl rounded-m3-lg z-50 mt-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {suggestions.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addRecipient(u.email)}
                            className="w-full text-left px-6 py-4 hover:bg-surface-1 transition-colors flex flex-col gap-0.5"
                          >
                            <span className="text-sm font-bold text-surface-on">{u.name}</span>
                            <span className="text-[11px] text-surface-on-variant font-medium">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center border-b border-surface-variant/20 py-4">
                  <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">Sub</span>
                  <Input
                    {...register('subject')}
                    placeholder="Subject of your email"
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg font-bold h-10 p-0 text-surface-on"
                  />
                </div>
              </div>
              <div className="flex-1 pt-6">
                <Textarea
                  {...register('body')}
                  placeholder="Compose your message here..."
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full min-h-[400px] resize-none p-0 text-surface-on"
                />
              </div>
              <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-m3-lg text-[11px] font-black text-primary border border-primary/10 uppercase tracking-[0.25em] shrink-0">
                <Info className="h-5 w-5" />
                Edge-accelerated synchronization active
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}