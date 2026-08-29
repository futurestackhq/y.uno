import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hackathon/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";

import { dashboardNav } from "./nav";

export const AppSidebar = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <Sidebar className="border-r-[#eceff2]">
      <SidebarHeader className="items-start px-6 py-6">
        <img
          alt="yuno"
          className="-ml-2 h-5 w-auto object-contain object-left"
          height={20}
          src="/yuno-logo.svg"
          width={72}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {dashboardNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.to !== undefined && pathname === item.to;

                if (item.to) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        className="data-active:text-primary h-auto rounded-none px-2 py-2 text-sm data-active:bg-[rgb(62_79_224_/_8%)]"
                        isActive={isActive}
                        render={<Link to={item.to} />}
                      >
                        <Icon data-icon="inline-start" />
                        {item.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className="h-auto rounded-none px-2 py-2 text-sm"
                      disabled
                    >
                      <Icon data-icon="inline-start" />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
