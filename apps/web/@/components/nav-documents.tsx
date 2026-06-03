"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  name: string;
  url: string;
  icon: React.ReactNode;
};

export function NavDocuments({
  items,
  currentUrl,
  onNavigate,
}: {
  items: NavItem[];
  currentUrl: string;
  onNavigate: (url: string) => void;
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              isActive={currentUrl === item.url}
              render={
                <a
                  href={item.url}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item.url);
                  }}
                />
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
