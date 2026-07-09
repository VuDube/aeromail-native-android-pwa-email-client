import React, { useState } from 'react';
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
import { X, Send, Paperclip, Loader2, Info } from 'lucide-react';
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
  const { register, handleSubmit, formState: { errors } } = useForm({
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
  });
  const addRecipient = (email: string) => {
    if (email && !recipients.includes(email) && /^\S+@\S+\.\S+$/.test(email)) {
      setRecipients([...recipients, email]);
      setRecipientInput('');
      setShowSuggestions(false);
    }
  };
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };
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
          <header className="px-8 py-4 border-b flex items-center justify-between bg-surface-2/30">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-black tracking-tight">New Message</h2>
            </div>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={sendEmail.isPending}
              className="rounded-full bg-primary px-8 h-10 font-bold shadow-lg shadow-primary/20 gap-2"
            >
              {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </header>
          <form className="flex-1 p-8 flex flex-col space-y-4 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 relative">
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-variant/20 pb-2 min-h-[44px]">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest w-8">To</span>
                {recipients.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                    {r}
                    <button type="button" onClick={() => removeRecipient(r)}><X className="h-3 w-3" /></button>
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
                    placeholder={recipients.length === 0 ? "recipient@domain.com" : ""}
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-8 p-0"
                  />
                  {showSuggestions && recipientInput && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-64 bg-surface border border-surface-variant/20 shadow-2xl rounded-2xl z-50 mt-2 overflow-hidden">
                      {suggestions.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => addRecipient(u.email)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-1 transition-colors flex flex-col"
                        >
                          <span className="text-sm font-bold">{u.name}</span>
                          <span className="text-[10px] text-on-surface-variant">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center border-b border-surface-variant/20 py-2">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest w-8">Sub</span>
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
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl text-[10px] font-bold text-primary/60 border border-primary/5 uppercase tracking-widest">
              <Info className="h-4 w-4" />
              Real-time synchronization active
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}