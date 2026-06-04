import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSettingsTab } from "./settings/ai-settings-tab";
import { AuthSettingsTab } from "./settings/auth-settings-tab";
import { BrandingSettingsTab } from "./settings/branding-settings-tab";
import { FrontendSettingsTab } from "./settings/frontend-settings-tab";
import { type SettingsPageProps } from "./settings/types";
import { WorkspaceSettingsTab } from "./settings/workspace-settings-tab";

export function SettingsPage(props: SettingsPageProps) {
  return (
    <section className="grid gap-6">
      <Tabs defaultValue="workspace" className="grid gap-6">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <TabsList className="w-max min-w-full flex-nowrap md:grid md:w-full md:grid-cols-3 xl:grid-cols-5">
            <TabsTrigger className="shrink-0 md:flex-1" value="workspace">
              Workspace
            </TabsTrigger>
            <TabsTrigger className="shrink-0 md:flex-1" value="ai">
              AI
            </TabsTrigger>
            <TabsTrigger className="shrink-0 md:flex-1" value="branding">
              Branding
            </TabsTrigger>
            <TabsTrigger className="shrink-0 md:flex-1" value="auth">
              Auth
            </TabsTrigger>
            <TabsTrigger className="shrink-0 md:flex-1" value="frontend">
              Frontend
            </TabsTrigger>
          </TabsList>
        </div>

        <WorkspaceSettingsTab {...props} />
        <AiSettingsTab {...props} />
        <BrandingSettingsTab {...props} />
        <AuthSettingsTab {...props} />
        <FrontendSettingsTab {...props} />
      </Tabs>
    </section>
  );
}
