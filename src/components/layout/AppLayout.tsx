import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Inbox, Send, Archive, Trash2, Star, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
const NAV_ITEMS = [
  { icon: Inbox, label: "Inbox", path: "/", folder: "inbox" },
  { icon: Star, label: "Starred", path: "/starred", folder: "starred" },
  { icon: Send, label: "Sent", path: "/sent", folder: "sent" },
  { icon: Trash2, label: "Trash", path: "/trash", folder: "trash" },
];
export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {!isMobile && (
        <aside className="w-20 md:w-64 flex flex-col border-r bg-surface-1 py-4">
          <div className="px-4 mb-8 flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg" />
            <span className="hidden md:block font-bold text-xl tracking-tight">AeroMail</span>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-3 py-3 rounded-m3-lg transition-colors",
                  pathname === item.path 
                    ? "bg-secondary-container text-on-secondary-container" 
                    : "hover:bg-surface-2 text-on-surface-variant"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="hidden md:block text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-2 mt-auto">
            <Link to="/settings" className="flex items-center gap-4 px-3 py-3 rounded-m3-lg text-on-surface-variant hover:bg-surface-2">
              <Settings className="h-5 w-5 shrink-0" />
              <span className="hidden md:block text-sm font-medium">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative bg-surface">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
            {children}
          </div>
        </div>
        {isMobile && (
          <nav className="h-20 border-t bg-surface-2 flex items-center justify-around px-4 pb-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-colors",
                  pathname === item.path ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}