import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmailThread } from '@shared/types';
import { Plus, Search, Loader2, RefreshCw, Inbox as InboxIcon, Sparkles, X, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDensity } from '@/hooks/use-density';
import { ThreadCard } from '@/components/email/ThreadCard';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThreadPage } from '@/pages/ThreadPage';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
export function HomePage() {
  const queryClient = useQueryClient();
  const { folder = 'inbox' } = useParams<{ folder: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { density } = useDensity();
  useEffect(() => {
    setSelectedThreadId(null);
  }, [folder]);
  const { data: threads, isLoading, isFetching, error } = useQuery<EmailThread[]>({
    queryKey: ['threads', folder, searchQuery],
    queryFn: () => api<EmailThread[]>(`/api/emails?folder=${folder}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`),
    retry: 1,
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: any }) =>
      api(`/api/threads/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient?.invalidateQueries({ queryKey: ['threads'] })
  });
  const handleRefresh = useCallback(() => {
    queryClient?.invalidateQueries({ queryKey: ['threads'] });
    toast.success("Inbox refreshed");
  }, [queryClient]);
  const emailListContent = (
    <div className="h-full flex flex-col bg-background">
      <header className="p-4 lg:p-6 space-y-4 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter capitalize">{folder}</h1>
          <div className="flex items-center gap-3">
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary/50" />}
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="rounded-full">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="relative group w-full">
          <motion.div
            animate={{
              scale: isSearchFocused ? 1.01 : 1,
              boxShadow: isSearchFocused ? '0 10px 25px rgba(0,0,0,0.05)' : '0 2px 4px rgba(0,0,0,0.01)'
            }}
            className={cn(
              "relative flex items-center bg-surface-2 rounded-2xl transition-all border-2 border-transparent",
              isSearchFocused && "bg-background border-primary/20"
            )}
          >
            <Search className={cn("absolute left-4 h-4 w-4 transition-colors", isSearchFocused ? "text-primary" : "text-surface-on-variant/40")} />
            <Input
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mail..."
              className="w-full h-12 pl-12 pr-10 rounded-2xl bg-transparent border-none focus-visible:ring-0 text-sm font-bold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 p-1 hover:bg-surface-variant/20 rounded-full">
                <X className="h-3 w-3" />
              </button>
            )}
          </motion.div>
        </div>
      </header>
      <section className="flex-1 overflow-y-auto px-2 lg:px-4 pb-24 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Syncing Edge...</p>
          </div>
        ) : threads && threads.length > 0 ? (
          <div className="space-y-px">
            {threads.map((thread, idx) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                idx={idx}
                density={density}
                isActive={selectedThreadId === thread.id}
                onSelect={isMobile ? undefined : (id) => setSelectedThreadId(id)}
                onArchive={(id) => {
                  toggleMutation.mutate({ id, updates: { folder: 'trash' } });
                  if (selectedThreadId === id) setSelectedThreadId(null);
                  toast.info("Moved to Trash");
                }}
                onToggleRead={(id, cur) => toggleMutation.mutate({ id, updates: { isRead: !cur } })}
                onToggleStar={(id, cur) => toggleMutation.mutate({ id, updates: { isStarred: !cur } })}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6 opacity-40 py-20">
            <InboxIcon className="h-10 w-10" />
            <p className="text-sm font-bold tracking-tight">No messages in {folder}</p>
          </div>
        )}
      </section>
    </div>
  );
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-40 flex flex-col items-center justify-center gap-8">
          <Database className="h-12 w-12 text-destructive" />
          <h2 className="text-3xl font-black tracking-tighter">Connection Error</h2>
          <p className="text-muted-foreground text-sm max-w-xs text-center">{(error as any).message}</p>
          <Button onClick={() => window.location.reload()} className="rounded-full px-10 h-14 font-black">Retry Connection</Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="py-8 md:py-10 lg:py-12 h-full flex flex-col">
          <div className="flex-1 rounded-m3-xl border border-surface-variant/10 overflow-hidden shadow-2xl bg-surface-1">
            {isMobile ? (
              emailListContent
            ) : (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                  {emailListContent}
                </ResizablePanel>
                <ResizableHandle className="w-1 bg-surface-variant/5 hover:bg-primary/20 transition-colors" />
                <ResizablePanel defaultSize={65}>
                  <div className="h-full bg-surface-1/30">
                    <AnimatePresence mode="wait">
                      {selectedThreadId ? (
                        <motion.div key={selectedThreadId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                          <ThreadPage embeddedId={selectedThreadId} onBack={() => setSelectedThreadId(null)} />
                        </motion.div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                          <div className="h-24 w-24 bg-surface-2 rounded-full flex items-center justify-center"><Sparkles className="h-10 w-10 text-primary/20" /></div>
                          <h3 className="text-2xl font-black tracking-tight">Select a conversation</h3>
                          <p className="text-muted-foreground text-sm max-w-xs">Pick an email from the list to view its contents and reply.</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        </div>
      </div>
      <Link to="/compose">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="m3-fab shadow-xl shadow-primary/30" layoutId="compose-fab">
          <Plus className="h-10 w-10" />
        </motion.button>
      </Link>
    </AppLayout>
  );
}