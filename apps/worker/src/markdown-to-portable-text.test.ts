import { describe, expect, it } from "vitest";

import { markdownToPortableText } from "./markdown-to-portable-text";

describe("markdownToPortableText", () => {
  it("supports inline code and tables", async () => {
    const blocks = await markdownToPortableText("Inline `code`\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n");

    expect(blocks[0]).toMatchObject({
      _type: "block",
      children: [
        { text: "Inline ", marks: [] },
        { text: "code", marks: ["code"] },
      ],
    });

    expect(blocks[1]).toMatchObject({
      _type: "markdownTable",
      rows: [
        { isHeader: true, cells: ["A", "B"] },
        { isHeader: false, cells: ["1", "2"] },
      ],
    });
  });

  it("supports block shortcodes", async () => {
    const blocks = await markdownToPortableText(
      "Intro paragraph.\n\n[block:whatsapp-cta title=\"Chat Admin\" tagline=\"Hubungi kami\" text=\"Dapatkan bantuan cepat\" colorVariant=\"secondary\" sectionWidth=\"narrow\" stackAlign=\"center\" /]\n\n[block:hero-2 title=\"Partner Bisnis\" tagline=\"Tech Partner\" text=\"One stop digital agency\" /]\n\nOutro paragraph."
    );

    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toMatchObject({
      _type: "block",
      style: "normal",
    });

    expect(blocks[1]).toMatchObject({
      _type: "whatsapp-cta",
      title: "Chat Admin",
      tagLine: "Hubungi kami",
      colorVariant: "secondary",
      sectionWidth: "narrow",
      stackAlign: "center",
      body: [
        {
          _type: "block",
          children: [
            {
              _type: "span",
              text: "Dapatkan bantuan cepat",
            },
          ],
        },
      ],
    });

    expect(blocks[2]).toMatchObject({
      _type: "hero-2",
      title: "Partner Bisnis",
      tagLine: "Tech Partner",
      body: [
        {
          _type: "block",
          children: [
            {
              _type: "span",
              text: "One stop digital agency",
            },
          ],
        },
      ],
    });

    expect(blocks[3]).toMatchObject({
      _type: "block",
      style: "normal",
    });
  });

  it("supports full practical hero and CTA shortcode fields", async () => {
    const blocks = await markdownToPortableText(
      [
        '[block:hero-1 tagline="Layanan IT" uiIcon="monitor" title="Solusi Digital" text="Website, software, dan support IT." primaryTitle="Lihat Layanan" primaryHref="/services" primaryVariant="default" secondaryTitle="Hubungi Kami" secondaryHref="/contact" secondaryVariant="outline" /]',
        '[block:whatsapp-cta paddingTop="true" paddingBottom="false" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="Butuh Bantuan" uiIcon="message-circle" title="Chat via WhatsApp" text="Tim kami siap membantu." secondaryTitle="Lihat Layanan" secondaryHref="/services" secondaryVariant="outline" /]',
      ].join("\n\n")
    );

    expect(blocks[0]).toMatchObject({
      _type: "hero-1",
      tagLine: "Layanan IT",
      uiIcon: { provider: "lu", name: "monitor" },
      title: "Solusi Digital",
      links: [
        { _type: "link", title: "Lihat Layanan", href: "/services", buttonVariant: "default" },
        { _type: "link", title: "Hubungi Kami", href: "/contact", buttonVariant: "outline" },
      ],
    });

    expect(blocks[1]).toMatchObject({
      _type: "whatsapp-cta",
      padding: { _type: "section-padding", top: true, bottom: false },
      colorVariant: "primary",
      sectionWidth: "default",
      stackAlign: "left",
      tagLine: "Butuh Bantuan",
      uiIcon: { provider: "lu", name: "message-circle" },
      title: "Chat via WhatsApp",
      secondaryLink: { _type: "link", title: "Lihat Layanan", href: "/services", buttonVariant: "outline" },
    });
  });

  it("supports Sanity-clean SEO and utility blocks", async () => {
    const blocks = await markdownToPortableText(
      [
        '[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="muted" title="Manfaat" description="Alasan memilih kami" benefits="Konsultatif|Support berkelanjutan|Harga transparan" /]',
        '[block:value-props-block title="Kenapa Kami" description="Nilai utama" valueProps="zap::Cepat::Respons cepat untuk kebutuhan bisnis|shield::Aman::Solusi dibuat defensif" /]',
        '[block:all-posts colorVariant="default" displayMode="grid" contentTypes="post|service" limit="4" /]',
      ].join("\n\n")
    );

    expect(blocks[0]).toMatchObject({
      _type: "benefits-block",
      padding: { _type: "section-padding", top: true, bottom: true },
      colorVariant: "muted",
      title: "Manfaat",
      description: "Alasan memilih kami",
      benefits: ["Konsultatif", "Support berkelanjutan", "Harga transparan"],
    });

    expect(blocks[1]).toMatchObject({
      _type: "value-props-block",
      title: "Kenapa Kami",
      description: "Nilai utama",
      valueProps: [
        { _type: "valueProp", icon: "zap", title: "Cepat", description: "Respons cepat untuk kebutuhan bisnis" },
        { _type: "valueProp", icon: "shield", title: "Aman", description: "Solusi dibuat defensif" },
      ],
    });

    expect(blocks[2]).toMatchObject({
      _type: "all-posts",
      colorVariant: "default",
      displayMode: "grid",
      contentTypes: ["post", "service"],
      limit: 4,
    });
  });

  it("supports nested split, grid, and timeline block shortcode arrays", async () => {
    const blocks = await markdownToPortableText(
      [
        '[block:split-row paddingTop="true" paddingBottom="true" colorVariant="background" noGap="true" splitColumns="content::Konsultasi::Audit kebutuhan dan prioritas bisnis::Pelajari::/services|cards::Cepat::Respon cepat::Aman::Implementasi defensif|info::Support::Tim membantu setelah live::Maintenance,Monitoring" /]',
        '[block:grid-row paddingTop="true" paddingBottom="true" colorVariant="background" textAlign="center" cardStyle="bordered" gridColumns="grid-cols-3" cards="monitor::Website Development::Company profile dan landing page::/services/website|server::IT Support::Maintenance perangkat dan jaringan::/services/it-support" /]',
        '[block:timeline-row paddingTop="true" paddingBottom="true" colorVariant="background" timelines="Discovery::Pemetaan kebutuhan bisnis|Proposal::Scope dan estimasi jelas|Implementasi::Eksekusi bertahap" /]',
      ].join("\n\n")
    );

    expect(blocks[0]).toMatchObject({
      _type: "split-row",
      padding: { _type: "section-padding", top: true, bottom: true },
      colorVariant: "background",
      noGap: true,
      splitColumns: [
        { _type: "split-content", title: "Konsultasi" },
        { _type: "split-cards-list", list: [{ title: "Cepat" }, { title: "Aman" }] },
        { _type: "split-info-list", list: [{ title: "Support", tags: ["Maintenance", "Monitoring"] }] },
      ],
    });

    expect(blocks[1]).toMatchObject({
      _type: "grid-row",
      textAlign: "center",
      cardStyle: "bordered",
      gridColumns: "grid-cols-3",
      columns: [
        { _type: "grid-card", uiIcon: { provider: "lu", name: "monitor" }, title: "Website Development", excerpt: "Company profile dan landing page" },
        { _type: "grid-card", uiIcon: { provider: "lu", name: "server" }, title: "IT Support", excerpt: "Maintenance perangkat dan jaringan" },
      ],
    });

    expect(blocks[2]).toMatchObject({
      _type: "timeline-row",
      timelines: [
        { _type: "timelines-1", title: "Discovery" },
        { _type: "timelines-1", title: "Proposal" },
        { _type: "timelines-1", title: "Implementasi" },
      ],
    });
  });
});
