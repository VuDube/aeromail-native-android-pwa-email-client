import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Inbox, Send, Trash2, Star, Settings, ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useDensity } from "@/hooks/use-density";
const NAV_ITEMS = [
  { icon: Inbox, label: "Inbox", path: "/", match: (p: string) => p === "/" || p === "/inbox" },
  { icon: Star, label: "Starred", path: "/starred", match: (p: string) => p === "/starred" },
  { icon: Send, label: "Sent", path: "/sent", match: (p: string) => p === "/sent" },
  { icon: Trash2, label: "Trash", path: "/trash", match: (p: string) => p === "/trash" },
];
export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { density } = useDensity();
  const pathname = location?.pathname || "/";
  const isActive = (item: typeof NAV_ITEMS[0]) => item.match(pathname);
  const isSettingsActive = pathname === "/settings";
  const showBack = isMobile && (
    pathname.startsWith('/thread/') ||
    pathname === '/compose' ||
    pathname === '/settings'
  );
  const getPageTitle = () => {
    if (pathname === '/compose') return 'Compose';
    if (pathname === '/settings') return 'Settings';
    if (pathname.startsWith('/thread/')) return 'Message';
    const active = NAV_ITEMS.find(isActive);
    return active ? active.label : 'AeroMail';
  };
  return (
    <div className={cn(
      "flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/20",
      density === 'compact' ? "density-compact" : "density-comfortable"
    )}>
      {/* Desktop Navigation Rail */}
      {!isMobile && (
        <aside className={cn(
          "flex flex-col border-r bg-surface-1/50 transition-all duration-300 relative z-30",
          density === 'compact' ? "w-16 md:w-56" : "w-20 md:w-64"
        )}>
          <div className={cn("flex items-center gap-3", density === 'compact' ? "px-4 py-6" : "px-6 py-8")}>
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20 transition-transform hover:rotate-6">A</div>
            <span className="hidden md:block font-bold text-xl tracking-tighter text-on-surface">AeroMail</span>
          </div>
          <nav className="flex-1 px-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 rounded-full transition-all duration-300 group relative",
                  density === 'compact' ? "py-2.5" : "py-3.5",
                  isActive(item)
                    ? "text-primary font-bold"
                    : "text-on-surface-variant hover:bg-surface-2"
                )}
              >
                {isActive(item) && (
                  <motion.div 
                    layoutId="nav-active-bg"
                    className="absolute inset-0 bg-primary-container rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-active:scale-90", isActive(item) && "fill-current")} />
                <span className="hidden md:block text-sm tracking-tight">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-3 pb-8">
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-full transition-all group relative",
                isSettingsActive ? "text-primary font-bold" : "text-on-surface-variant hover:bg-surface-2"
              )}
            >
              {isSettingsActive && (
                <motion.div 
                  layoutId="nav-active-bg"
                  className="absolute inset-0 bg-primary-container rounded-full -z-10"
                />
              )}
              <Settings className={cn("h-5 w-5 transition-transform group-hover:rotate-45", isSettingsActive && "animate-spin-slow")} />
              <span className="hidden md:block text-sm font-semibold">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {isMobile && (
          <header className={cn(
            "border-b bg-surface-1/80 backdrop-blur-md flex items-center px-4 gap-4 shrink-0 z-30 transition-all",
            density === 'compact' ? "h-14" : "h-16"
          )}>
            {showBack ? (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full -ml-2">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            ) : (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">A</div>
            )}
            <span className="font-bold text-lg tracking-tight truncate">{getPageTitle()}</span>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="rounded-full"><Search className="h-5 w-5" /></Button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, scale: 0.98, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 1.02, x: -10 }}
              transition={{ duration: 0.15, ease: "circOut" }}
              className="absolute inset-0 overflow-y-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {isMobile && !pathname.startsWith('/compose') && !pathname.startsWith('/thread/') && (
          <nav className={cn(
            "border-t bg-surface-1/90 backdrop-blur-md flex items-center justify-around px-2 shrink-0 z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]",
            density === 'compact' ? "h-14" : "h-16"
          )}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl transition-all duration-300 relative",
                  isActive(item) ? "text-primary" : "text-on-surface-variant opacity-70"
                )}
              >
                {isActive(item) && (
                  <motion.div 
                    layoutId="mobile-nav-pill"
                    className="absolute inset-x-0 h-1 bg-primary bottom-0 rounded-t-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <item.icon className={cn("h-5 w-5 transition-transform", isActive(item) && "scale-110 fill-primary/10")} />
                <span className={cn("text-[9px] font-bold tracking-wider uppercase", isActive(item) && "opacity-100")}>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}