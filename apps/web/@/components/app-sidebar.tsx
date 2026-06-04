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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { Workspace } from "@/lib/api";

const data = {
  navMain: [
    {
      title: "Dashboard",
      route: "dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Posts",
      route: "posts",
      icon: <FileTextIcon />,
    },
    {
      title: "Scheduled",
      route: "scheduled",
      icon: <CalendarClockIcon />,
    },
    {
      title: "Sanity Sync",
      route: "sanity-sync",
      icon: <FolderSyncIcon />,
    },
    {
      title: "AI Batch",
      route: "ai-batch",
      icon: <SparklesIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      route: "settings",
      icon: <Settings2Icon />,
    },
    {
      title: "API Status",
      route: "api-status",
      icon: <DatabaseIcon />,
    },
    {
      title: "Search",
      route: "posts",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "All Notes",
      route: "posts",
      icon: <FileSearchIcon />,
    },
    {
      name: "Publish Queue",
      route: "scheduled",
      icon: <FileClockIcon />,
    },
    {
      name: "Sanity Mirror",
      route: "sanity-sync",
      icon: <FolderSyncIcon />,
    },
    {
      name: "AI Batch",
      route: "ai-batch",
      icon: <SparklesIcon />,
    },
  ],
};

function buildWorkspaceUrl(workspaceSlug: string, route: string) {
  return `#/w/${workspaceSlug}/${route}`;
}

export function AppSidebar({
  currentUrl,
  onNavigate,
  onCreate,
  userEmail,
  onLogout,
  workspaces,
  activeWorkspaceSlug,
  onSelectWorkspace,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onCreate: () => void;
  userEmail: string;
  onLogout: () => void;
  workspaces: Workspace[];
  activeWorkspaceSlug: string;
  onSelectWorkspace: (slug: string) => void;
}) {
  const navMainItems = data.navMain.map((item) => ({
    ...item,
    url: buildWorkspaceUrl(activeWorkspaceSlug, item.route),
  }));
  const navSecondaryItems = data.navSecondary.map((item) => ({
    ...item,
    url: buildWorkspaceUrl(activeWorkspaceSlug, item.route),
  }));
  const documentItems = data.documents.map((item) => ({
    ...item,
    url: buildWorkspaceUrl(activeWorkspaceSlug, item.route),
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={
                <a
                  href={buildWorkspaceUrl(activeWorkspaceSlug, "dashboard")}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(buildWorkspaceUrl(activeWorkspaceSlug, "dashboard"));
                  }}
                />
              }
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">KOTACOM CMS</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-2">
          <Select value={activeWorkspaceSlug} onValueChange={(value) => value && onSelectWorkspace(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.slug}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMainItems}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
          onCreate={onCreate}
        />
        <NavDocuments
          items={documentItems}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
        />
        <NavSecondary
          items={navSecondaryItems}
          currentUrl={currentUrl}
          onNavigate={onNavigate}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "CMS Admin",
            email: userEmail,
            avatar: "/avatars/shadcn.jpg",
          }}
          onLogout={onLogout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
