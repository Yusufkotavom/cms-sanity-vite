import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSettingsTab } from "./settings/ai-settings-tab";
import { AuthSettingsTab } from "./settings/auth-settings-tab";
import { BrandingSettingsTab } from "./settings/branding-settings-tab";
import { FrontendSettingsTab } from "./settings/frontend-settings-tab";
import { SanitySettingsTab } from "./settings/sanity-settings-tab";
import { type SettingsPageProps } from "./settings/types";
import { WorkspaceSettingsTab } from "./settings/workspace-settings-tab";

export function SettingsPage(props: SettingsPageProps) {
  return (
    <section className="grid gap-6">
      <Tabs defaultValue="workspace" className="grid gap-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="sanity">Sanity</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
        </TabsList>

        <WorkspaceSettingsTab {...props} />
        <SanitySettingsTab {...props} />
        <AiSettingsTab {...props} />
        <BrandingSettingsTab {...props} />
        <AuthSettingsTab {...props} />
        <FrontendSettingsTab {...props} />
      </Tabs>
    </section>
  );
}
