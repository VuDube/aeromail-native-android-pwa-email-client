import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Inbox, Send, Archive, Trash2, Star, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
const NAV_ITEMS = [
  { icon: Inbox, label: "Inbox", path: "/", folder: "inbox" },
  { icon: Star, label: "Starred", path: "/starred", folder: "starred" },
  { icon: Send, label: "Sent", path: "/sent", folder: "sent" },
  { icon: Trash2, label: "Trash", path: "/trash", folder: "trash" },
];
export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };
  const showBack = isMobile && (pathname.startsWith('/thread/') || pathname === '/compose');
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {!isMobile && (
        <aside className="w-20 md:w-64 flex flex-col border-r bg-surface-1 py-4">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">A</div>
            <span className="hidden md:block font-bold text-xl tracking-tight text-on-surface">AeroMail</span>
          </div>
          <nav className="flex-1 px-3 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-m3-lg transition-all duration-200",
                  isActive(item.path)
                    ? "bg-secondary-container text-on-secondary-container"
                    : "hover:bg-surface-2 text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.path) && "fill-current")} />
                <span className="hidden md:block text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-3 mt-auto">
            <Link to="/settings" className="flex items-center gap-4 px-4 py-3 rounded-m3-lg text-on-surface-variant hover:bg-surface-2 transition-all">
              <Settings className="h-5 w-5 shrink-0" />
              <span className="hidden md:block text-sm font-medium">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-surface">
        {isMobile && (
          <header className="h-16 border-b bg-surface-1 flex items-center px-4 gap-4 shrink-0">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            <span className="font-bold text-lg text-on-surface">
              {pathname === '/compose' ? 'Compose' : pathname.startsWith('/thread/') ? 'Message' : 'AeroMail'}
            </span>
          </header>
        )}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        {isMobile && !pathname.startsWith('/compose') && (
          <nav className="h-16 border-t bg-surface-2 flex items-center justify-around px-2 shrink-0">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-2xl transition-all duration-200",
                  isActive(item.path) ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.path) && "fill-current")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}