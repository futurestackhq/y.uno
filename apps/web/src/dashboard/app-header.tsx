import { Avatar, AvatarFallback } from "@hackathon/ui/components/avatar";
import { SidebarTrigger } from "@hackathon/ui/components/sidebar";
import { Switch } from "@hackathon/ui/components/switch";
import { useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown } from "lucide-react";

const sectionTitle = (pathname: string): string => {
  if (pathname.startsWith("/routing")) {
    return "Routing";
  }
  return "Home";
};

export const AppHeader = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#eceff2] bg-white/60 px-6 backdrop-blur-[20px]">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <p className="text-sm">{sectionTitle(pathname)}</p>
      </div>
      <div className="flex items-center gap-3">
        <label
          className="flex items-center gap-2 text-[12px]"
          htmlFor="test-mode"
        >
          Test mode · Off
          <Switch aria-label="Test mode" disabled id="test-mode" />
        </label>
        <Bell aria-hidden className="text-muted-foreground size-4" />
        <div className="flex items-center gap-1">
          <Avatar className="bg-secondary" size="sm">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              A
            </AvatarFallback>
          </Avatar>
          <ChevronDown aria-hidden className="text-muted-foreground size-3" />
        </div>
      </div>
    </header>
  );
};
