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
      toast.success('Message sent');
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
      toast.error("Invalid email address");
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
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 h-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-full bg-surface-1 rounded-[32px] shadow-xl border border-surface-variant/20 flex flex-col overflow-hidden"
        >
          <header className="px-8 py-4 border-b flex items-center justify-between bg-surface-2/30 shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-black tracking-tight">New Message</h2>
            </div>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={sendEmail.isPending}
              className="rounded-full bg-primary px-8 h-10 font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <AnimatePresence mode="wait" initial={false}>
                {sendEmail.isPending ? (
                  <motion.div key="loader" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Send className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              Send
            </Button>
          </header>
          <form className="flex-1 p-8 flex flex-col space-y-4 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 relative shrink-0">
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-variant/20 pb-2 min-h-[44px]">
                <span className="text-[10px] font-black text-surface-on-variant uppercase tracking-widest w-8">To</span>
                {recipients.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold transition-all">
                    {r}
                    <button type="button" onClick={() => removeRecipient(r)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
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
                    onBlur={() => {
                      // Slight delay to allow suggestion clicks to register
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder={recipients.length === 0 ? "recipient@domain.com" : ""}
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-8 p-0"
                  />
                  {showSuggestions && recipientInput && suggestions.length > 0 && (
                    <div ref={suggestionRef} className="absolute top-full left-0 w-64 bg-surface border border-surface-variant/20 shadow-2xl rounded-2xl z-50 mt-2 overflow-hidden">
                      {suggestions.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing before click
                          onClick={() => addRecipient(u.email)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-1 transition-colors flex flex-col"
                        >
                          <span className="text-sm font-bold">{u.name}</span>
                          <span className="text-[10px] text-surface-on-variant">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center border-b border-surface-variant/20 py-2">
                <span className="text-[10px] font-black text-surface-on-variant uppercase tracking-widest w-8">Sub</span>
                <Input
                  {...register('subject')}
                  placeholder="Subject"
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base font-bold h-8 p-0"
                />
              </div>
            </div>
            <div className="flex-1 pt-4">
              <Textarea
                {...register('body')}
                placeholder="Compose your email..."
                className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full resize-none p-0"
              />
            </div>
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl text-[10px] font-bold text-primary opacity-60 border border-primary/10 uppercase tracking-widest shrink-0">
              <Info className="h-4 w-4" />
              Edge-sync active for recipients
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}