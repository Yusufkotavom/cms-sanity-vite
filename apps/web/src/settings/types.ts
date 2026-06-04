import type { Dispatch, SetStateAction } from "react";

import type {
  AiSettings,
  ApiConfig,
  AuthSettings,
  OgBrandingSettings,
  SanitySettings,
  Workspace,
} from "@/lib/api";

export type WorkspaceFormState = {
  id: string | null;
  name: string;
  slug: string;
  domain: string;
  description: string;
  timezone: string;
  status: "active" | "archived";
};

export type SettingsPageProps = {
  apiBaseUrl: string;
  apiBaseUrlInput: string;
  setApiBaseUrlInput: Dispatch<SetStateAction<string>>;
  saveApiBaseOverride: () => void;
  resetApiBaseOverride: () => void;
  getDefaultApiBaseUrl: () => string;
  activeWorkspaceSlug: string;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  workspaceEditorSlug: string;
  workspaceForm: WorkspaceFormState;
  setWorkspaceForm: Dispatch<SetStateAction<WorkspaceFormState>>;
  workspaceSanitySettings: SanitySettings;
  setWorkspaceSanitySettings: Dispatch<SetStateAction<SanitySettings>>;
  setWorkspaceSanityTestFingerprint: Dispatch<SetStateAction<string>>;
  loadWorkspaceIntoEditor: (workspace: Workspace) => void;
  switchWorkspace: (slug: string) => void;
  testWorkspaceSanityBeforeSave: () => Promise<void>;
  saveWorkspace: () => Promise<void>;
  resetWorkspaceEditor: () => void;
  deleteWorkspace: () => Promise<void>;
  isTestingWorkspaceSanity: boolean;
  isSavingWorkspace: boolean;
  isDeletingWorkspace: boolean;
  isWorkspaceFormComplete: boolean;
  isWorkspaceSanityComplete: boolean;
  hasWorkspaceSanityTestPassed: boolean;
  sanitySettings: SanitySettings | null;
  setSanitySettings: Dispatch<SetStateAction<SanitySettings | null>>;
  testSanitySettings: () => Promise<void>;
  saveSanitySettings: () => Promise<void>;
  isTestingSanity: boolean;
  isSavingSanity: boolean;
  config: ApiConfig | null;
  authConfig: AuthSettings | null;
  authEmail: string;
  getStoredAuthToken: () => string | null;
  copyToken: (kind: "session" | "integration", value: string) => Promise<void>;
  isCopyingToken: null | "session" | "integration";
  aiSettings: AiSettings | null;
  setAiSettings: Dispatch<SetStateAction<AiSettings | null>>;
  saveAiSettings: () => Promise<void>;
  ogBrandingSettings: OgBrandingSettings | null;
  setOgBrandingSettings: Dispatch<SetStateAction<OgBrandingSettings | null>>;
  saveOgBrandingSettings: () => Promise<void>;
  slugify: (value: string) => string;
};
