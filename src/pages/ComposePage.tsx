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
import { X, Send, Loader2, Save, Trash2, Undo, Bold, Italic, Link as LinkIcon, List, Type } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { DomainInfo } from '@shared/types';
import { cn } from '@/lib/utils';
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
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);
  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => api('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify({ ...data, to: recipients[0] })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      navigate('/');
    },
    onError: (err: any) => toast.error(err.message || "Sending failed")
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
  const onSubmit = (data: any) => {
    if (recipients.length === 0) return toast.error("Add at least one recipient");
    toast.custom((t) => (
      <div className="bg-foreground text-background p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-border min-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-bold">Sending...</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { 
            if (undoTimerRef.current) {
              clearTimeout(undoTimerRef.current);
              undoTimerRef.current = null;
              toast.dismiss(t);
              toast.info('Sending cancelled');
            }
          }}
          className="text-primary hover:bg-primary/10 font-black gap-2"
        >
          <Undo className="h-4 w-4" /> UNDO
        </Button>
      </div>
    ), { duration: 3000 });
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
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 md:py-12">
        <motion.div
          layoutId="compose-fab"
          className="bg-surface-1 rounded-m3-xl shadow-2xl border border-surface-variant/20 flex flex-col overflow-hidden min-h-[75vh] relative"
        >
          {(saveDraftMutation.isPending || sendEmailMutation.isPending) && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-[50] flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          <header className="px-8 py-5 border-b flex items-center justify-between bg-surface-2/40">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => (isDirty || recipients.length > 0) ? setShowDiscardDialog(true) : navigate(-1)} className="rounded-full">
                <X className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-black tracking-tight">Compose</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => saveDraftMutation.mutate({ subject: currentSubject, body: currentBody, from: selectedFrom })}
                disabled={saveDraftMutation.isPending || sendEmailMutation.isPending}
                className="rounded-full font-bold h-11"
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={sendEmailMutation.isPending || saveDraftMutation.isPending}
                className="rounded-full bg-primary px-10 h-11 font-bold shadow-lg shadow-primary/20 gap-2"
              >
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </header>
          <form className="flex-1 p-6 md:p-10 flex flex-col space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex items-center gap-4 border-b border-surface-variant/10 pb-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-10">From</span>
              <Select value={selectedFrom} onValueChange={(val) => setValue('from', val)}>
                <SelectTrigger className="bg-transparent border-none shadow-none focus:ring-0 p-0 h-auto font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-m3-lg">
                  <SelectItem value="user@aeromail.dev" className="font-bold">user@aeromail.dev</SelectItem>
                  {enabledDomains.map(d => (
                    <SelectItem key={d.id} value={`hello@${d.name}`} className="font-bold">hello@{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-surface-variant/10 py-3 min-h-[48px]">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-10">To</span>
              <AnimatePresence>
                {recipients.map(r => (
                  <motion.span
                    key={r}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-primary/20"
                  >
                    {r} <button type="button" onClick={() => setRecipients(recipients.filter(x => x !== r))}><X className="h-3 w-3" /></button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <Input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addRecipient(recipientInput))}
                placeholder="Add recipients..."
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-8 p-0"
              />
            </div>
            <div className="flex items-center border-b border-surface-variant/10 py-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-10">Sub</span>
              <Input {...register('subject')} placeholder="Subject" className="bg-transparent border-none shadow-none focus-visible:ring-0 text-lg font-bold h-8 p-0" />
            </div>
            <div className="flex-1 pt-4 relative group">
              <Textarea {...register('body')} placeholder="Message content..." className="bg-transparent border-none shadow-none focus-visible:ring-0 text-base leading-relaxed h-full min-h-[300px] resize-none p-0" />
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-surface-2/90 backdrop-blur-md px-6 py-2 rounded-full border border-surface-variant/20 shadow-xl flex items-center gap-6 pointer-events-auto">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Bold className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bold</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Italic className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Italic</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Type className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Typography</TooltipContent></Tooltip>
                    <div className="w-px h-4 bg-surface-variant/30 mx-1" />
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><LinkIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Insert Link</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><List className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bullet List</TooltipContent></Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="rounded-m3-xl">
          <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black">Discard draft?</AlertDialogTitle><AlertDialogDescription>You'll lose your current changes. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => navigate(-1)} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"><Trash2 className="h-4 w-4 mr-2" /> Discard</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}