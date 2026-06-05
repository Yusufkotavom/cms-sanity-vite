import type { SettingsPageProps } from "./types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { FieldInfo } from "./field-info";

type BrandingSettingsTabProps = Pick<
  SettingsPageProps,
  "ogBrandingSettings" | "setOgBrandingSettings" | "saveOgBrandingSettings"
>;

export function BrandingSettingsTab({
  ogBrandingSettings,
  setOgBrandingSettings,
  saveOgBrandingSettings,
}: BrandingSettingsTabProps) {
  return (
    <TabsContent value="branding" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>OG Branding</CardTitle>
          <CardDescription>Atur logo dan teks OG agar bisa dipakai untuk profile atau business berbeda.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          {ogBrandingSettings ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="Logo URL" description="URL logo yang akan diunduh worker untuk compose OG image fallback." />
                  <Input
                    value={ogBrandingSettings.logoUrl}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, logoUrl: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="OG Base URL" description="URL frontend Sanity-clean yang punya /api/og agar hasil CMS sama dengan Studio." />
                  <Input
                    value={ogBrandingSettings.ogBaseUrl}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, ogBaseUrl: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Workflow label" description="Label besar yang muncul di OG image." />
                  <Input
                    value={ogBrandingSettings.workflowLabel}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, workflowLabel: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Footer text" description="Teks kecil di footer OG image. Kosongkan untuk default worker." />
                  <Input
                    value={ogBrandingSettings.footerText}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, footerText: event.target.value } : current
                      )
                    }
                  />
                </div>
              </div>
              <Button onClick={() => void saveOgBrandingSettings()}>Save OG branding</Button>
            </>
          ) : (
            <span>Loading OG branding settings...</span>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
