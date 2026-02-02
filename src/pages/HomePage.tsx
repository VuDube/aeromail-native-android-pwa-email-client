import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Email } from '@shared/types';
import { format } from 'date-fns';
import { Plus, Search, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
export function HomePage() {
  const queryClient = useQueryClient();
  const { data: emails, isLoading } = useQuery<Email[]>({
    queryKey: ['emails', 'inbox'],
    queryFn: () => api<Email[]>('/api/emails?folder=inbox'),
  });
  const simulateInbound = useMutation({
    mutationFn: () => api('/api/simulation/inbound', { 
      method: 'POST', 
      body: JSON.stringify({ subject: `New Message ${Date.now()}` }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('New email received!');
    }
  });
  useEffect(() => {
    // Initial data seed if empty
    api('/api/init').then(() => queryClient.invalidateQueries({ queryKey: ['emails'] }));
  }, [queryClient]);
  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-50 group-focus-within:opacity-100 transition-opacity" />
            <Input 
              placeholder="Search in mail" 
              className="w-full h-12 pl-12 rounded-m3-xl bg-surface-2 border-none focus-visible:ring-primary transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium text-on-surface px-2">Inbox</h1>
            <button 
              onClick={() => simulateInbound.mutate()}
              className="text-xs font-medium text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
              disabled={simulateInbound.isPending}
            >
              Simulate Inbound
            </button>
          </div>
        </header>
        <section className="space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Syncing your inbox...</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {emails?.map((email, idx) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex items-start gap-4 p-4 rounded-m3-lg cursor-pointer transition-colors group ${
                    email.isRead ? 'bg-transparent hover:bg-surface-1' : 'bg-surface-2 hover:bg-surface-3'
                  }`}
                >
                  <div className="shrink-0 pt-1">
                    <Star className={`h-5 w-5 ${email.isStarred ? 'fill-tertiary text-tertiary' : 'text-on-surface-variant opacity-30'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm truncate ${!email.isRead ? 'font-bold' : 'font-medium'}`}>
                        {email.from.name}
                      </span>
                      <span className="text-[10px] text-on-surface-variant shrink-0 font-medium">
                        {format(email.timestamp, 'h:mm a')}
                      </span>
                    </div>
                    <h3 className={`text-sm truncate mb-0.5 ${!email.isRead ? 'font-semibold' : 'text-on-surface'}`}>
                      {email.subject}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-1 opacity-70">
                      {email.snippet}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {!isLoading && emails?.length === 0 && (
            <div className="text-center py-20 space-y-2">
              <div className="text-4xl">📭</div>
              <p className="text-on-surface-variant font-medium">Your inbox is empty</p>
            </div>
          )}
        </section>
      </div>
      <button 
        className="m3-fab lg:h-16 lg:w-44 lg:rounded-2xl lg:gap-3"
        aria-label="Compose email"
      >
        <Plus className="h-6 w-6" />
        <span className="hidden lg:block font-medium">Compose</span>
      </button>
    </AppLayout>
  );
}