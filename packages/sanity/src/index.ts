import { createClient } from "@sanity/client";

export function getSanityClient(config: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
}) {
  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: config.apiVersion,
    token: config.token,
    useCdn: false,
  });
}
