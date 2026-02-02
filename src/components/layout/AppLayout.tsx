import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Inbox, Send, Trash2, Star, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  const pathname = location?.pathname || "/";
  const isActive = (item: typeof NAV_ITEMS[0]) => item.match(pathname);
  const isSettingsActive = pathname === "/settings";
  // Back button logic for mobile
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
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Desktop Rail / Drawer */}
      {!isMobile && (
        <aside className="w-20 md:w-64 flex flex-col border-r bg-surface-1 py-6 transition-all duration-300">
          <div className="px-6 mb-10 flex items-center gap-3">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-md">A</div>
            <span className="hidden md:block font-bold text-xl tracking-tight text-on-surface">AeroMail</span>
          </div>
          <nav className="flex-1 px-3 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-m3-lg transition-all duration-200 group",
                  isActive(item)
                    ? "bg-secondary-container text-on-secondary-container"
                    : "hover:bg-surface-2 text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-active:scale-90", isActive(item) && "fill-current")} />
                <span className="hidden md:block text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-3 mt-auto">
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-m3-lg transition-all",
                isSettingsActive
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-2"
              )}
            >
              <Settings className={cn("h-5 w-5 shrink-0", isSettingsActive && "animate-spin-slow")} />
              <span className="hidden md:block text-sm font-medium">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-surface overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-16 border-b bg-surface-1 flex items-center px-4 gap-4 shrink-0 shadow-sm z-20">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full active:bg-surface-variant">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            <span className="font-bold text-lg text-on-surface animate-in fade-in slide-in-from-left-2">
              {getPageTitle()}
            </span>
          </header>
        )}
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-surface">
          {children}
        </div>
        {/* Mobile Bottom Navigation */}
        {isMobile && !pathname.startsWith('/compose') && !pathname.startsWith('/thread/') && (
          <nav className="h-16 border-t bg-surface-2 flex items-center justify-around px-2 shrink-0 z-20">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl transition-all duration-200",
                  isActive(item) ? "bg-secondary-container text-on-secondary-container shadow-sm" : "text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item) && "fill-current")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            ))}
            <Link
              to="/settings"
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl transition-all duration-200",
                isSettingsActive ? "bg-secondary-container text-on-secondary-container shadow-sm" : "text-on-surface-variant"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Settings</span>
            </Link>
          </nav>
        )}
      </main>
    </div>
  );
}