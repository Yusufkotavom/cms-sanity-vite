# Sanity shortcode coverage and parser alignment design

Date: 2026-06-13
Project: cms-sanity-vite
Reference schema source: /home/kotacom/projects/Sanity-clean

## Goal

Align markdown shortcode parsing in `apps/worker/src/markdown-to-portable-text.ts` with page block schemas from `Sanity-clean`, then document every supported page block as valid shortcode samples inside this project knowledge base.

## Problem

Current parser already supports many block types, but coverage is not fully aligned with `Sanity-clean` page block registry.

Gaps found:
- parser and schema source are in different repos
- some block examples only cover partial fields
- docs only explain `whatsapp-cta` and `hero-2`
- at least one registered schema block in `Sanity-clean` is missing explicit parser support: `benefits-block`
- some parser-only block types do not belong to current `Sanity-clean` page block registry, so docs risk drifting from actual schema source
- current shortcode attribute parsing is regex-based and narrow

## Source of truth

Use `Sanity-clean` page block registry as source of truth:
- `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/shared/page-blocks.ts`
- supporting block schema files under `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/**`

Official target block set:
- hero-1
- hero-2
- stats-hero-block
- section-header
- split-row
- grid-row
- carousel-1
- carousel-2
- timeline-row
- cta-1
- whatsapp-cta
- logo-cloud-1
- faqs
- form-newsletter
- all-posts
- legacy-rich-content
- company-info
- testimonials-block
- pricing-block
- faq-block
- benefits-block
- features-package-block
- service-types-block
- problem-solution-block
- value-props-block

## Chosen approach

Update parser plus documentation manually, with schema-driven mapping discipline.

Why this approach:
- directly satisfies user request
- keeps output practical for AI prompt use and human copywriters
- avoids building full schema-introspection tooling
- lets tests enforce sample validity

## Shortcode design

Keep single-line block shortcode format:

```md
[block:block-name key="value" key2="value2" /]
```

Rules:
- shortcode must occupy its own paragraph line
- values use double quotes only
- arrays use pipe separators where practical
- nested object lists use compact multi-part item encoding where needed

### Shared attribute conventions

Primitive conventions:
- booleans: `"true"`, `"false"`
- numbers: decimal strings
- text body: `text="..."`
- tagline maps to `tagLine`

Padding convention:
- `paddingTop="true"`
- `paddingBottom="true"`

Single link conventions:
- `linkTitle`
- `linkHref`
- `linkTarget`
- `linkVariant`
- `linkIsExternal`

Secondary link conventions:
- `secondaryTitle`
- `secondaryHref`
- `secondaryTarget`
- `secondaryVariant`
- `secondaryIsExternal`

Two-link array convention for blocks with `links` array:
- `primaryTitle`
- `primaryHref`
- `primaryTarget`
- `primaryVariant`
- `primaryIsExternal`
- `secondaryTitle`
- `secondaryHref`
- `secondaryTarget`
- `secondaryVariant`
- `secondaryIsExternal`

Simple array convention:
- `items="A|B|C"`
- `features="Feature A|Feature B"`
- `contentTypes="post|service|project"`

Structured array convention:
- each item encoded with `::`
- items separated with `|`
- example:
  - `valueProps="shield::Fast response::Tim support cepat|badge::Harga transparan::Tanpa biaya tersembunyi"`

This is chosen because current parser can be extended with predictable string splitting without requiring JSON inside markdown.

## Parser changes

File:
- `apps/worker/src/markdown-to-portable-text.ts`

Planned parser improvements:

1. Keep existing block detection flow.
2. Replace ad-hoc per-field coercion with shared helpers:
   - `parseBooleanAttr`
   - `parseNumberAttr`
   - `parsePadding`
   - `makeBody`
   - `makeLinkFromPrefix`
   - `parsePipeArray`
   - `parseStructuredItems`
3. Add explicit support for `benefits-block`.
4. Align explicit handlers with `Sanity-clean` field names where feasible.
5. Expand hero and CTA parsing to include all schema fields that can be represented safely in shortcode.
6. Preserve generic fallback for unknown block types.

### Supported field mapping policy

Parser will support fields that are safely representable as shortcode attributes and useful in content workflows.

Included categories:
- string
- text
- boolean
- number
- enum/radio option strings
- section padding object
- block-content from `text`
- simple links
- simple arrays
- structured arrays of simple objects

Deferred categories:
- image asset upload from non-markdown block attrs
- internal Sanity references in shortcode samples
- complex rich text nested inside nested cards

For fields that exist in schema but are not safely representable in shortcode, docs will mark them as Studio-only.

## Documentation output

Write knowledge base doc in this project:
- `docs/sanity-block-shortcodes.md`

Doc sections:
1. Purpose and source of truth
2. Global shortcode syntax rules
3. Shared attribute reference
4. Block-by-block mapping
   - schema block name
   - shortcode name
   - field mapping table
   - valid sample shortcode
   - notes on unsupported or Studio-only fields
5. AI-safe recommended blocks
6. Known limitations

Also update existing KB workflow doc:
- `docs/knowledge-base-and-ai-workflow.md`

Update section 6 so it no longer documents only two shortcodes. Replace with summary and pointer to full shortcode KB file.

## Testing

Update:
- `apps/worker/src/markdown-to-portable-text.test.ts`

Tests will verify:
- existing shortcode parsing still works
- `hero-1` full practical example parses
- `hero-2` full practical example parses
- `whatsapp-cta` full practical example parses
- `benefits-block` parses
- one structured-array SEO block parses
- one primitive option block parses

Goal of tests is parser confidence, not exhaustive golden coverage for every block.

## Non-goals

- no edits to `Sanity-clean` schemas
- no automatic schema-to-doc generator in this pass
- no guarantee of encoding every schema field if field depends on uploaded assets, references, or complex portable text internals
- no reverse shortcode generation from Sanity Portable Text in this pass

## Risks and mitigation

Risk: shortcode format becomes hard to read for nested arrays.
Mitigation: keep nested syntax consistent and document examples.

Risk: parser docs drift from `Sanity-clean` later.
Mitigation: doc header will state exact source-of-truth file and last sync date.

Risk: fallback generic blocks create invalid shapes.
Mitigation: docs only bless schema-backed blocks. Tests cover representative blocks.

## Implementation sequence

1. inspect each `Sanity-clean` block schema and extract field map
2. update parser helpers and explicit handlers
3. add missing block handlers
4. write block-by-block shortcode KB doc
5. update workflow KB summary
6. add parser tests
7. run worker tests
