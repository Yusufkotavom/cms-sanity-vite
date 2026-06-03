import * as React from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  CalendarClockIcon,
  CommandIcon,
  DatabaseIcon,
  FileClockIcon,
  FileSearchIcon,
  FileTextIcon,
  FolderSyncIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SparklesIcon,
  Settings2Icon,
} from "lucide-react";

const data = {
  user: {
    name: "KOTACOM Editor",
    email: "editor@kotacom.id",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Posts",
      url: "#/posts",
      icon: <FileTextIcon />,
    },
    {
      title: "Scheduled",
      url: "#/scheduled",
      icon: <CalendarClockIcon />,
    },
    {
      title: "Sanity Sync",
      url: "#/sanity-sync",
      icon: <FolderSyncIcon />,
    },
    {
      title: "AI Batch",
      url: "#/ai-batch",
      icon: <SparklesIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "API Status",
      url: "#/api-status",
      icon: <DatabaseIcon />,
    },
    {
      title: "Search",
      url: "#/posts",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "All Notes",
      url: "#/posts",
      icon: <FileSearchIcon />,
    },
    {
      name: "Publish Queue",
      url: "#/scheduled",
      icon: <FileClockIcon />,
    },
    {
      name: "Sanity Mirror",
      url: "#/sanity-sync",
      icon: <FolderSyncIcon />,
    },
    {
      name: "AI Batch",
      url: "#/ai-batch",
      icon: <SparklesIcon />,
    },
  ],
};

export function AppSidebar({
  currentUrl,
  onNavigate,
  onCreate,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onCreate: () => void;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={
                <a
                  href="#/dashboard"
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate("#/dashboard");
                  }}
                />
              }
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">KOTACOM CMS</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
          onCreate={onCreate}
        />
        <NavDocuments
          items={data.documents}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
        />
        <NavSecondary
          items={data.navSecondary}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
