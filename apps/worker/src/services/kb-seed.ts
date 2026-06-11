import type { KbEntryType } from "../db/repositories/kb-entries";

type CompanyInfoLink = {
  url: string;
  title: string;
  description: string;
  keywords?: string[];
  use?: string;
};

type CompanyInfoJson = {
  company?: {
    coreServices?: string[];
    valuePropositions?: string[];
    proofPoints?: string[];
    defaultCta?: string[];
  };
  links?: CompanyInfoLink[];
  generationRules?: {
    global?: {
      guardrails?: string[];
    };
    moneyPage?: {
      purpose?: string;
      requiredSections?: string[];
      guardrails?: string[];
    };
    blogPost?: {
      purpose?: string;
      guardrails?: string[];
    };
  };
};

type SeedEntry = {
  type: KbEntryType;
  category: string;
  title: string;
  content: string;
  keywords: string;
  modes: string;
  priority: number;
  isActive: boolean;
  metadataJson: string | null;
};

const WEBSITE_KEYWORDS = "website, web, landing page, company profile, toko online, web app, e-commerce";
const SOFTWARE_KEYWORDS = "software, aplikasi, sistem, POS, CRM, dashboard, otomasi, custom";
const IT_SUPPORT_KEYWORDS = "IT support, network, server, maintenance, service komputer, instalasi, infrastruktur";
const PRINTING_KEYWORDS = "percetakan, cetak, brosur, kalender, seminar kit, desain, branding, materi promosi";

function inferCategoryFromKeywords(keywords: string): string {
  const lower = keywords.toLowerCase();
  if (/web|landing|company profile|toko online|e-commerce/.test(lower)) return "website";
  if (/software|aplikasi|sistem|pos|crm|dashboard|otomasi/.test(lower)) return "software";
  if (/it support|network|server|maintenance|service komputer|infrastruktur/.test(lower)) return "it-support";
  if (/cetak|percetakan|brosur|kalender|desain|branding|seminar/.test(lower)) return "printing";
  return "general";
}

function buildLinkEntries(links: CompanyInfoLink[]): SeedEntry[] {
  return links.map((link) => {
    const keywords = (link.keywords ?? []).join(", ");
    const category = inferCategoryFromKeywords(keywords + " " + link.title);

    return {
      type: "url" as const,
      category,
      title: link.title,
      content: `URL: ${link.url}\n${link.description}${link.use ? `\nGunakan untuk: ${link.use}` : ""}`,
      keywords,
      modes: "",
      priority: 8,
      isActive: true,
      metadataJson: JSON.stringify({ url: link.url }),
    };
  });
}

function buildServiceEntries(services: string[]): SeedEntry[] {
  return services.map((service) => {
    const category = inferCategoryFromKeywords(service);

    return {
      type: "product" as const,
      category,
      title: service,
      content: `Layanan: ${service}. Sebutkan secara natural saat relevan dengan topik artikel.`,
      keywords: service.toLowerCase(),
      modes: "",
      priority: 5,
      isActive: true,
      metadataJson: null,
    };
  });
}

function buildValuePropEntries(propositions: string[]): SeedEntry[] {
  return propositions.map((prop) => ({
    type: "block" as const,
    category: "general",
    title: prop.slice(0, 60),
    content: `Value proposition: ${prop}`,
    keywords: "",
    modes: "",
    priority: 3,
    isActive: true,
    metadataJson: null,
  }));
}

function buildProofPointEntries(proofPoints: string[]): SeedEntry[] {
  return proofPoints.map((point) => ({
    type: "block" as const,
    category: "general",
    title: point.slice(0, 60),
    content: `Proof point: ${point}. Gunakan hanya saat relevan untuk membangun kepercayaan.`,
    keywords: "",
    modes: "",
    priority: 4,
    isActive: true,
    metadataJson: null,
  }));
}

function buildGuardrailEntries(guardrails: string[]): SeedEntry[] {
  return guardrails.map((rule) => ({
    type: "policy" as const,
    category: "general",
    title: `Guardrail: ${rule.slice(0, 50)}`,
    content: rule,
    keywords: "",
    modes: "",
    priority: 10,
    isActive: true,
    metadataJson: null,
  }));
}

function buildTemplateEntries(
  rules: { purpose?: string; requiredSections?: string[]; guardrails?: string[] },
  category: string,
  modes: string
): SeedEntry[] {
  const entries: SeedEntry[] = [];

  if (rules.purpose) {
    entries.push({
      type: "template" as const,
      category,
      title: `Template ${category}: ${rules.purpose.slice(0, 50)}`,
      content: `Purpose: ${rules.purpose}${rules.requiredSections ? `\nRequired sections: ${rules.requiredSections.join(", ")}` : ""}${rules.guardrails ? `\nGuardrails:\n${rules.guardrails.map((g) => `- ${g}`).join("\n")}` : ""}`,
      keywords: "",
      modes,
      priority: 7,
      isActive: true,
      metadataJson: null,
    });
  }

  return entries;
}

export function buildKbEntriesFromCompanyInfo(data: CompanyInfoJson): SeedEntry[] {
  const entries: SeedEntry[] = [];

  if (data.links) {
    entries.push(...buildLinkEntries(data.links));
  }

  if (data.company?.coreServices) {
    entries.push(...buildServiceEntries(data.company.coreServices));
  }

  if (data.company?.valuePropositions) {
    entries.push(...buildValuePropEntries(data.company.valuePropositions));
  }

  if (data.company?.proofPoints) {
    entries.push(...buildProofPointEntries(data.company.proofPoints));
  }

  if (data.generationRules?.global?.guardrails) {
    entries.push(...buildGuardrailEntries(data.generationRules.global.guardrails));
  }

  if (data.generationRules?.moneyPage) {
    entries.push(...buildTemplateEntries(data.generationRules.moneyPage, "money-page", "outline_to_post"));
  }

  if (data.generationRules?.blogPost) {
    entries.push(...buildTemplateEntries(data.generationRules.blogPost, "blog", "outline,outline_to_post"));
  }

  return entries;
}
