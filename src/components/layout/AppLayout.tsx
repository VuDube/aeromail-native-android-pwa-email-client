import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Inbox, Send, Trash2, Star, Settings, ChevronLeft, Search, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useDensity } from "@/hooks/use-density";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsFetching } from "@tanstack/react-query";
const NAV_ITEMS = [
  { id: "nav-inbox", icon: Inbox, label: "Inbox", path: "/", match: (p: string) => p === "/" || p === "/inbox" },
  { id: "nav-starred", icon: Star, label: "Starred", path: "/starred", match: (p: string) => p === "/starred" },
  { id: "nav-sent", icon: Send, label: "Sent", path: "/sent", match: (p: string) => p === "/sent" },
  { id: "nav-trash", icon: Trash2, label: "Trash", path: "/trash", match: (p: string) => p === "/trash" },
];
export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { density } = useDensity();
  const isFetching = useIsFetching();
  const isSyncing = isFetching > 0;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pathname = location?.pathname || "/";
  const isActive = (item: typeof NAV_ITEMS[0]) => item.match(pathname);
  useEffect(() => {
    const handleScroll = (e: any) => {
      setShowScrollTop(e.target.scrollTop > 400);
    };
    const mainArea = document.getElementById("main-scroll-area");
    mainArea?.addEventListener("scroll", handleScroll);
    return () => mainArea?.removeEventListener("scroll", handleScroll);
  }, []);
  const getPageTitle = () => {
    if (pathname === '/compose') return 'Compose';
    if (pathname === '/settings') return 'Settings';
    if (pathname.startsWith('/thread/')) return 'Message';
    const active = NAV_ITEMS.find(isActive);
    return active ? active.label : 'AeroMail';
  };
  return (
    <div className={cn(
      "flex h-screen w-full bg-background overflow-hidden text-foreground",
      density === 'compact' ? "density-compact" : "density-comfortable"
    )}>
      {/* System Status Line */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] pointer-events-none overflow-hidden">
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] w-1/3"
            />
          )}
        </AnimatePresence>
      </div>
      {!isMobile && (
        <aside className={cn(
          "flex flex-col border-r bg-surface-1 transition-all duration-300 relative z-30",
          density === 'compact' ? "w-20 lg:w-64" : "w-24 lg:w-72"
        )}>
          <div className="px-6 py-8 flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black shadow-xl shadow-primary/20 transition-transform hover:rotate-12 cursor-pointer">A</div>
            <span className="hidden lg:block font-black text-xl tracking-tighter">AeroMail</span>
          </div>
          <TooltipProvider delayDuration={0}>
            <nav className="flex-1 px-4 space-y-2">
              {NAV_ITEMS.map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link
                      id={item.id}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-full transition-all group relative",
                        isActive(item) ? "text-primary font-black" : "text-surface-on-variant hover:bg-surface-2"
                      )}
                    >
                      {isActive(item) && (
                        <motion.div
                          layoutId="nav-active-pill"
                          className="absolute inset-0 bg-primary-container rounded-full -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <item.icon className={cn("h-6 w-6 shrink-0", isActive(item) && "fill-primary/20")} />
                      <span className="hidden lg:block text-sm font-bold tracking-tight">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden bg-on-surface text-surface text-xs font-bold">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>
            <div className="px-4 pb-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    id="nav-settings"
                    to="/settings"
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-full transition-all group relative",
                      pathname === "/settings" ? "text-primary font-black" : "text-surface-on-variant hover:bg-surface-2"
                    )}
                  >
                    {pathname === "/settings" && (
                      <motion.div layoutId="nav-active-pill" className="absolute inset-0 bg-primary-container rounded-full -z-10" />
                    )}
                    <Settings className="h-6 w-6 group-hover:rotate-45 transition-transform" />
                    <span className="hidden lg:block text-sm font-bold tracking-tight">Settings</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden bg-on-surface text-surface text-xs font-bold">Settings</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {isMobile && (
          <header className="h-16 border-b bg-surface/80 backdrop-blur-xl flex items-center px-4 gap-4 shrink-0 z-30">
            {pathname.startsWith('/thread/') || pathname === '/compose' ? (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            ) : (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs">A</div>
            )}
            <span className="font-black text-lg tracking-tight truncate">{getPageTitle()}</span>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="rounded-full"><Search className="h-5 w-5" /></Button>
            </div>
          </header>
        )}
        <div id="main-scroll-area" className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => document.getElementById("main-scroll-area")?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-24 right-8 h-12 w-12 rounded-2xl bg-surface-variant text-surface-on-variant shadow-lg z-40 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                <ArrowUp className="h-6 w-6" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {isMobile && !pathname.startsWith('/thread/') && !pathname.startsWith('/compose') && (
          <nav className="h-16 border-t bg-surface/90 backdrop-blur-xl flex items-center justify-around px-4 shrink-0 z-30 touch-none">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 relative w-16 transition-all",
                  isActive(item) ? "text-primary" : "text-surface-on-variant opacity-60"
                )}
              >
                {isActive(item) && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute -top-1 inset-x-0 h-8 bg-primary-container rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn("h-6 w-6", isActive(item) && "fill-primary/20")} />
                <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}