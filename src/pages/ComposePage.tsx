import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Loader2, Info, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_USERS } from '@shared/mock-data';
import { DomainInfo } from '@shared/types';
const composeSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  from: z.string().email('Invalid sender address')
});
export function ComposePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: () => api<DomainInfo[]>('/api/domains') });
  const enabledDomains = useMemo(() => domains?.filter(d => d.localEnabled) || [], [domains]);
  const { register, handleSubmit, setValue, watch } = useForm({
    resolver: zodResolver(composeSchema),
    defaultValues: { subject: '', body: '', from: 'user@aeromail.dev' }
  });
  const selectedFrom = watch('from');
  useEffect(() => {
    if (enabledDomains.length > 0 && !selectedFrom.includes('@')) {
      setValue('from', `hello@${enabledDomains[0].name}`);
    }
  }, [enabledDomains, setValue, selectedFrom]);
  const sendEmail = useMutation({
    mutationFn: (data: any) => api('/api/emails/send', { method: 'POST', body: JSON.stringify({ ...data, fromEmail: data.from }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Message sent');
      navigate('/');
    }
  });
  const addRecipient = useCallback((email: string) => {
    const trimmed = email.trim().replace(',', '');
    if (trimmed && !recipients.includes(trimmed) && /^\S+@\S+\.\S+$/.test(trimmed)) {
      setRecipients(prev => [...prev, trimmed]);
      setRecipientInput('');
      setShowSuggestions(false);
    }
  }, [recipients]);
  const onSubmit = (data: any) => {
    if (recipients.length === 0) return toast.error("Add a recipient");
    sendEmail.mutate({ ...data, to: recipients[0] });
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-surface-1 rounded-m3-xl shadow-2xl border border-surface-variant/20 flex flex-col overflow-hidden min-h-[70vh]">
            <header className="px-8 py-6 border-b flex items-center justify-between bg-surface-2/30">
              <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><X className="h-6 w-6" /></Button>
                <h2 className="text-2xl font-black tracking-tight">New Message</h2>
              </div>
              <Button onClick={handleSubmit(onSubmit)} disabled={sendEmail.isPending} className="rounded-full bg-primary px-10 h-12 font-bold shadow-lg shadow-primary/20 gap-3">
                {sendEmail.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Send
              </Button>
            </header>
            <form className="flex-1 p-8 md:p-12 flex flex-col space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* From Selector */}
              <div className="flex items-center gap-4 border-b border-surface-variant/10 pb-4">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">From</span>
                <Select value={selectedFrom} onValueChange={(val) => setValue('from', val)}>
                  <SelectTrigger className="bg-transparent border-none shadow-none focus:ring-0 p-0 h-auto font-bold text-surface-on w-auto min-w-[200px]">
                    <SelectValue placeholder="Select Sender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-m3-lg border-surface-variant/20 shadow-2xl">
                    <SelectItem value="user@aeromail.dev" className="font-bold">user@aeromail.dev (Default)</SelectItem>
                    {enabledDomains.map(d => (
                      <SelectItem key={d.id} value={`hello@${d.name}`} className="font-bold">hello@{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* To Field */}
              <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant/10 py-4 min-h-[56px]">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">To</span>
                {recipients.map(r => (
                  <span key={r} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold border border-primary/10">
                    {r} <button type="button" onClick={() => setRecipients(recipients.filter(x => x !== r))}><X className="h-4 w-4" /></button>
                  </span>
                ))}
                <Input value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addRecipient(recipientInput))} placeholder={recipients.length === 0 ? "Recipient email..." : ""} className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-10 p-0 font-medium" />
              </div>
              {/* Subject */}
              <div className="flex items-center border-b border-surface-variant/10 py-4">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">Sub</span>
                <Input {...register('subject')} placeholder="Email Subject" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg font-bold h-10 p-0" />
              </div>
              {/* Body */}
              <div className="flex-1 pt-4">
                <Textarea {...register('body')} placeholder="Message body..." className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full min-h-[400px] resize-none p-0" />
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}