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
      "flex h-screen w-full bg-background overflow-hidden text-foreground",
      density === 'compact' ? "text-sm" : "text-base"
    )}>
      {/* Desktop Navigation Rail */}
      {!isMobile && (
        <aside className={cn(
          "flex flex-col border-r bg-surface-1 transition-all duration-300",
          density === 'compact' ? "w-16 md:w-56" : "w-20 md:w-64"
        )}>
          <div className={cn("flex items-center gap-3", density === 'compact' ? "px-4 py-4 mb-4" : "px-6 py-6 mb-8")}>
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20">A</div>
            <span className="hidden md:block font-bold text-xl tracking-tight">AeroMail</span>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 rounded-m3-lg transition-all duration-200 group",
                  density === 'compact' ? "py-2.5" : "py-3.5",
                  isActive(item)
                    ? "bg-primary-container text-on-primary-container"
                    : "hover:bg-surface-2 text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-active:scale-90", isActive(item) && "fill-current")} />
                <span className="hidden md:block text-sm font-semibold">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-3 pb-8">
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-m3-lg transition-all",
                isSettingsActive ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-2"
              )}
            >
              <Settings className={cn("h-5 w-5", isSettingsActive && "animate-spin-slow")} />
              <span className="hidden md:block text-sm font-semibold">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {isMobile && (
          <header className={cn(
            "border-b bg-surface-1 flex items-center px-4 gap-4 shrink-0 shadow-sm z-20 transition-all",
            density === 'compact' ? "h-14" : "h-16"
          )}>
            {showBack ? (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            ) : (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs">A</div>
            )}
            <span className="font-bold text-lg">{getPageTitle()}</span>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="rounded-full"><Search className="h-5 w-5" /></Button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {isMobile && !pathname.startsWith('/compose') && !pathname.startsWith('/thread/') && (
          <nav className={cn(
            "border-t bg-surface-2 flex items-center justify-around px-2 shrink-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]",
            density === 'compact' ? "h-14" : "h-16"
          )}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl transition-all duration-200",
                  isActive(item) ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item) && "fill-current")} />
                <span className="text-[10px] font-bold tracking-tight uppercase">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}