import type { SettingsPageProps } from "./types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type AuthSettingsTabProps = Pick<
  SettingsPageProps,
  "authConfig" | "authEmail" | "getStoredAuthToken" | "copyToken" | "isCopyingToken"
>;

export function AuthSettingsTab({
  authConfig,
  authEmail,
  getStoredAuthToken,
  copyToken,
  isCopyingToken,
}: AuthSettingsTabProps) {
  return (
    <TabsContent value="auth" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth & API Token</CardTitle>
          <CardDescription>
            Session token untuk browser saat ini, dan integration token untuk akses API dari app lain.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4">
            <span>
              Admin email: <code>{authConfig?.adminEmail ?? authEmail}</code>
            </span>
            <span>Session TTL: {authConfig?.sessionTtlHours ?? "-"} jam</span>
            <span>Integration token: {authConfig?.hasIntegrationToken ? "configured" : "not configured"}</span>
          </div>

          <div className="grid gap-2">
            <FieldInfo label="Current session token" description="Token session browser aktif. Gunakan hanya untuk debugging internal." />
            <Textarea
              readOnly
              value={getStoredAuthToken() ?? ""}
              placeholder="Login dulu untuk melihat session token browser"
              className="min-h-24 font-mono text-xs"
            />
            <Button
              variant="outline"
              onClick={() => void copyToken("session", getStoredAuthToken() ?? "")}
              disabled={isCopyingToken !== null || !getStoredAuthToken()}
            >
              {isCopyingToken === "session" ? "Copying..." : "Copy session token"}
            </Button>
          </div>

          <div className="grid gap-2">
            <FieldInfo label="Static integration token" description="Pakai token ini untuk integrasi eksternal lewat header Authorization." />
            <Textarea
              readOnly
              value={authConfig?.integrationToken ?? ""}
              placeholder="Set AUTH_INTEGRATION_TOKEN di Worker env agar token muncul di sini"
              className="min-h-24 font-mono text-xs"
            />
            <Button
              variant="outline"
              onClick={() => void copyToken("integration", authConfig?.integrationToken ?? "")}
              disabled={isCopyingToken !== null || !authConfig?.integrationToken}
            >
              {isCopyingToken === "integration" ? "Copying..." : "Copy integration token"}
            </Button>
            <div className="text-xs text-muted-foreground">
              Header contoh: <code>Authorization: Bearer {authConfig?.integrationToken || "<your-token>"}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
