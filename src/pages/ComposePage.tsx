import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, Send, Loader2, Save, Trash2, Undo } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api<DomainInfo[]>('/api/domains')
  });
  const enabledDomains = useMemo(() => domains?.filter(d => d.localEnabled) || [], [domains]);
  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm({
    resolver: zodResolver(composeSchema),
    defaultValues: { subject: '', body: '', from: 'user@aeromail.dev' }
  });
  const selectedFrom = watch('from');
  const currentSubject = watch('subject');
  const currentBody = watch('body');
  useEffect(() => {
    if (enabledDomains.length > 0 && selectedFrom === 'user@aeromail.dev') {
      setValue('from', `hello@${enabledDomains[0].name}`);
    }
  }, [enabledDomains, setValue, selectedFrom]);
  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify({ ...data, to: recipients[0] })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      navigate('/');
    }
  });
  const saveDraftMutation = useMutation({
    mutationFn: (data: any) => api('/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ ...data, to: recipients })
    }),
    onSuccess: () => {
      toast.success('Draft saved');
      queryClient.invalidateQueries({ queryKey: ['threads', 'drafts'] });
    }
  });
  const handleUndoSend = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
      toast.dismiss('undo-send-toast');
      toast.info('Sending cancelled');
    }
  };
  const onSubmit = (data: any) => {
    if (recipients.length === 0) return toast.error("Add at least one recipient");
    toast.custom((t) => (
      <div className="bg-surface-on text-surface p-4 rounded-m3-lg shadow-2xl flex items-center justify-between gap-4 border border-surface-variant/20 min-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-bold">Sending in 3s...</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => { handleUndoSend(); toast.dismiss(t); }}
          className="text-primary hover:bg-primary/10 font-black gap-2"
        >
          <Undo className="h-4 w-4" /> UNDO
        </Button>
      </div>
    ), { id: 'undo-send-toast', duration: 3000 });
    undoTimerRef.current = setTimeout(() => {
      sendEmailMutation.mutate(data);
    }, 3000);
  };
  const addRecipient = useCallback((email: string) => {
    const trimmed = email.trim().replace(',', '');
    if (trimmed && !recipients.includes(trimmed) && /^\S+@\S+\.\S+$/.test(trimmed)) {
      setRecipients(prev => [...prev, trimmed]);
      setRecipientInput('');
    }
  }, [recipients]);
  const handleClose = () => {
    if (isDirty || recipients.length > 0) {
      setShowDiscardDialog(true);
    } else {
      navigate(-1);
    }
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className="bg-surface-1 rounded-m3-xl shadow-2xl border border-surface-variant/20 flex flex-col overflow-hidden min-h-[70vh]"
          >
            <header className="px-8 py-6 border-b flex items-center justify-between bg-surface-2/30">
              <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
                  <X className="h-6 w-6" />
                </Button>
                <h2 className="text-2xl font-black tracking-tight">Compose</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => saveDraftMutation.mutate({ subject: currentSubject, body: currentBody, from: selectedFrom })}
                  disabled={saveDraftMutation.isPending}
                  className="rounded-full font-bold gap-2"
                >
                  {saveDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="hidden sm:inline">Save Draft</span>
                </Button>
                <Button 
                  onClick={handleSubmit(onSubmit)} 
                  disabled={sendEmailMutation.isPending} 
                  className="rounded-full bg-primary px-10 h-12 font-bold shadow-lg shadow-primary/20 gap-3"
                >
                  {sendEmailMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Send
                </Button>
              </div>
            </header>
            <form className="flex-1 p-8 md:p-12 flex flex-col space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex items-center gap-4 border-b border-surface-variant/10 pb-4">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">From</span>
                <Select value={selectedFrom} onValueChange={(val) => setValue('from', val)}>
                  <SelectTrigger className="bg-transparent border-none shadow-none focus:ring-0 p-0 h-auto font-bold text-surface-on w-auto">
                    <SelectValue placeholder="Select Sender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-m3-lg">
                    <SelectItem value="user@aeromail.dev" className="font-bold">user@aeromail.dev</SelectItem>
                    {enabledDomains.map(d => (
                      <SelectItem key={d.id} value={`hello@${d.name}`} className="font-bold">hello@{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant/10 py-4 min-h-[56px]">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">To</span>
                <AnimatePresence>
                  {recipients.map(r => (
                    <motion.span 
                      key={r}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold border border-primary/10"
                    >
                      {r} <button type="button" onClick={() => setRecipients(recipients.filter(x => x !== r))}><X className="h-4 w-4" /></button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                <Input 
                  value={recipientInput} 
                  onChange={(e) => setRecipientInput(e.target.value)} 
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addRecipient(recipientInput))} 
                  placeholder="Recipient email..." 
                  className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base h-10 p-0 font-medium" 
                />
              </div>
              <div className="flex items-center border-b border-surface-variant/10 py-4">
                <span className="text-[11px] font-black text-surface-on-variant uppercase tracking-[0.2em] w-12">Sub</span>
                <Input {...register('subject')} placeholder="Subject" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg font-bold h-10 p-0" />
              </div>
              <div className="flex-1 pt-4">
                <Textarea {...register('body')} placeholder="Message body..." className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full min-h-[400px] resize-none p-0" />
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="rounded-m3-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Discard message?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              You'll lose your current draft. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-full font-bold">Keep Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate(-1)} 
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold gap-2"
            >
              <Trash2 className="h-4 w-4" /> Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}