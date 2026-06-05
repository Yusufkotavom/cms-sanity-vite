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
                  <FieldInfo label="Generator mode" description="Local memakai generator CMS sebagai utama. Remote memakai OG Base URL sebagai engine lama/Sanity-clean." />
                  <div className="flex gap-2">
                    {(["local", "remote"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={ogBrandingSettings.generatorMode === mode ? "default" : "outline"}
                        onClick={() =>
                          setOgBrandingSettings((current) =>
                            current ? { ...current, generatorMode: mode } : current
                          )
                        }
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="Brand name" description="Teks brand di samping logo OG. Kosongkan untuk default KOTACOM." />
                  <Input
                    value={ogBrandingSettings.brandName}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, brandName: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="OG Base URL" description="Fallback remote /api/og. Dipakai hanya saat mode remote atau local generator gagal." />
                  <Input
                    value={ogBrandingSettings.ogBaseUrl}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, ogBaseUrl: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="Fallback image URL" description="Image kanan utama bila category tidak match. HTTPS image URL." />
                  <Input
                    value={ogBrandingSettings.fallbackImageUrl}
                    onChange={(event) =>
                      setOgBrandingSettings((current) =>
                        current ? { ...current, fallbackImageUrl: event.target.value } : current
                      )
                    }
                  />
                </div>
                {([
                  ["websiteImageUrl", "Website image URL"],
                  ["softwareImageUrl", "Software image URL"],
                  ["percetakanImageUrl", "Percetakan image URL"],
                  ["blogImageUrl", "Blog image URL"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="grid gap-2">
                    <FieldInfo label={label} description="Image kanan untuk category ini. HTTPS image URL." />
                    <Input
                      value={ogBrandingSettings[key]}
                      onChange={(event) =>
                        setOgBrandingSettings((current) =>
                          current ? { ...current, [key]: event.target.value } : current
                        )
                      }
                    />
                  </div>
                ))}
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
