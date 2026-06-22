# CMS Sanity Vite Parser Bugs & Limitations: Full Block Analysis

This document details the discrepancies, parsing limitations, and schema mismatch bugs found in the `cms-sanity-vite` shortcode-to-portable-text parser (`apps/worker/src/markdown-to-portable-text.ts`) when validated against the actual Sanity schemas defined in the `Sanity-clean` repository.

---

## Global / Shared Schema Mismatches

These issues affect multiple blocks and cause strict schema validation to fail when publishing content generated via markdown shortcodes.

### 1. Section Padding Type Mismatch
*   **Schema Type:** `"section-padding"` (kebab-case)
*   **Parser Output:** `_type: "sectionPadding"` (camelCase)
*   **Impact:** Any block that implements padding via the parser's `makePadding()` helper will output a padding object with `_type: "sectionPadding"`, failing Sanity's strict type verification.
*   **Affected Blocks:** `hero-vercel`, `stats-hero-block`, `split-row`, `grid-row`, `timeline-row`, `cta-1`, `whatsapp-cta`, `faqs`, `form-newsletter`, `all-posts`, `company-info`, `testimonials-block`, `pricing-block`, `faq-block`, `features-package-block`, `service-types-block`, `problem-solution-block`, `value-props-block`, `eeat-block`, `metrics-rail-block`.

### 2. UI Icon Type Mismatch
*   **Schema Type:** `"ui-icon"` (Expects an object containing `provider` and `name` properties)
*   **Parser Output:** Maps the shortcode attribute directly as a string (e.g. `uiIcon="monitor"` yields `"monitor"`).
*   **Impact:** Validation fails since a string is passed where a structured object is required.
*   **Affected Blocks:** `hero-1`, `hero-2`, `split-card`, `split-info`, `grid-card`, `pricing-card`, `cta-1`, `whatsapp-cta`.

### 3. Link Field Validation Mismatch
*   **Schema Type:** `"link"` (Custom validation requires `href` if `isExternal` is true, and `internalLink?._ref` if `isExternal` is false).
*   **Parser Output:** 
    *   If `isExternal` is `false` (e.g. relative links like `/services`), the parser generates a link with `isExternal: false` but only provides `href: "/services"` without any `internalLink` reference object. This triggers the validation error: `Internal link requires Internal Link reference.`
    *   If `href` is empty or missing on an external link, it fails validation with `External link requires URL (href).`
*   **Affected Blocks:** Every block containing single CTAs, links arrays, or secondary links.

---

## Detailed Block-by-Block Discrepancy Matrix

Below is the complete analysis of all page blocks compared between the `Sanity-clean` schemas and the `cms-sanity-vite` parser mapping (`parseBlockShortcode`).

### 1. Hero Blocks

#### `hero-1`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/hero/hero-1.ts`
*   **Discrepancies:**
    *   **Padding Field Drift:** The parser unconditionally injects `padding: makePadding()`, but the schema does **not** contain a `padding` field. This triggers validation error: `Unknown field found: padding`.
    *   **UI Icon Mismatch:** `uiIcon` is passed as a string instead of a `ui-icon` object.

#### `hero-2`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/hero/hero-2.ts`
*   **Discrepancies:**
    *   **Padding Field Drift:** The parser unconditionally injects `padding: makePadding()`, but the schema does **not** contain a `padding` field. This triggers validation error: `Unknown field found: padding`.
    *   **UI Icon Mismatch:** `uiIcon` is passed as a string instead of a `ui-icon` object.

#### `hero-vercel`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/hero/hero-vercel.ts`
*   **Discrepancies:**
    *   **Missing Array Mapping:** The parser completely omits the `cards` field in `parseBlockShortcode`, making it impossible to populate Vercel-style feature cards via shortcode.
    *   **Type Casing Mismatch:** The parser's internal type defines the cards as `heroFeatureCard` (camelCase) instead of `hero-feature-card` (kebab-case) defined in the schema.

#### `stats-hero-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/stats-hero-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

---

### 2. Section Header

#### `section-header`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/section-header.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser maps all text fields but completely omits the `padding` field, although the schema contains `padding` of type `section-padding`.

---

### 3. Split Blocks

#### `split-row`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/split/split-row.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **Nested Card Type Casing Mismatches:**
        *   `split-cards-list` contains items with type `splitCard` (camelCase) instead of `split-card` (kebab-case).
        *   `split-info-list` contains items with type `splitInfo` (camelCase) instead of `split-info` (kebab-case).
        *   `uiIcon` inside both card types is mapped as a string instead of a `ui-icon` object.

---

### 4. Grid Blocks

#### `grid-row`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/grid/grid-row.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **Field Name Mismatch:** The parser outputs the child columns under the property **`cards`**, while the Sanity schema expects **`columns`**.
    *   **Child Type Casing Mismatches:**
        *   The parser generates `gridCard` (camelCase) instead of `grid-card` (kebab-case).
        *   The parser generates `pricingCard` (camelCase) instead of `pricing-card` (kebab-case).
        *   The parser generates `gridPost` (camelCase) instead of `grid-post` (kebab-case).
    *   **Nesting Logic Mismatch:** Standalone `[block:grid-card]` or `[block:pricing-card]` shortcodes are treated as separate top-level blocks and are not nested within any parent row.
    *   **Limitation:** The `parseGridCards` inline parsing logic only outputs `gridCard` objects. It is currently impossible to parse `pricing-card` or `grid-post` items nested inline.
    *   **UI Icon Mismatch:** `uiIcon` in both `grid-card` and `pricing-card` is passed as a string.

---

### 5. Carousel Blocks

#### `carousel-1`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/carousel/carousel-1.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.

#### `carousel-2`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/carousel/carousel-2.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.

---

### 6. Timeline Blocks

#### `timeline-row`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/timeline/timeline-row.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

---

### 7. Call-to-Action (CTA) Blocks

#### `cta-1`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/cta/cta-1.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **UI Icon Mismatch:** `uiIcon` is mapped as a string instead of a `ui-icon` object.
    *   **Missing Attribute Mapping:** Schema fields `backgroundWidth`, `useCard`, `image`, and `imagePosition` are completely ignored by the parser.

#### `whatsapp-cta`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/cta/whatsapp-cta.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **UI Icon Mismatch:** `uiIcon` is mapped as a string instead of a `ui-icon` object.

---

### 8. Logo Cloud Blocks

#### `logo-cloud-1`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/logo-cloud/logo-cloud-1.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.

---

### 9. FAQs Blocks

#### `faqs`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/faqs.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

---

### 10. Form Blocks

#### `form-newsletter`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/forms/newsletter.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

---

### 11. All Posts Block

#### `all-posts`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/all-posts.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

---

### 12. SEO Blocks

#### `company-info`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/company-info.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `testimonials-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/testimonials-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `pricing-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/pricing-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `faq-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/faq-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `benefits-block`
*   **Discrepancies:**
    *   **Completely Missing in Schema:** The `benefits-block` is fully implemented in the parser and queries but does **not** exist in the `Sanity-clean` schemas. This makes the block entirely invalid in Sanity Studio.

#### `features-package-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/features-package-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `service-types-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/service-types-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **Missing Parsed Fields:** The parser structured array extractor for `services` parses only 5 arguments (`[title, description, features, timeline, badge]`) but completely omits the **`price`** and **`link`** fields, meaning these attributes are lost during parsing.

#### `problem-solution-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/problem-solution-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `value-props-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/value-props-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.

#### `eeat-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/eeat-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **Child Type Mismatch:** The parser generates child list items with `_type: "eeatPoint"`, whereas the schema defines an anonymous array of objects (which defaults to expecting `_type: "object"`).

#### `metrics-rail-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/metrics-rail-block.ts`
*   **Discrepancies:**
    *   **Padding Casing:** Suffers from the global `sectionPadding` vs `section-padding` mismatch.
    *   **Child Type Mismatch:** The parser generates child rail items with `_type: "metricItem"`, whereas the schema defines an anonymous array of objects (which defaults to expecting `_type: "object"`).

#### `highlights-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/highlights-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.

#### `reviews-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/reviews-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.
    *   **Unmapped Required Array:** The parser completely ignores parsing the `reviews` array. Since the schema validates `Rule.min(1)` for `reviews`, this block **always fails validation** when parsed via shortcode.

#### `quote-spotlight-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/quote-spotlight-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.

#### `micro-badges-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/micro-badges-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.
    *   **Child Type Mismatch:** The parser generates child items with `_type: "microBadge"`, whereas the schema defines an anonymous array of objects (which defaults to expecting `_type: "object"`).

#### `related-links-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/related-links-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.
    *   **Child Type Mismatch:** The parser generates child links with `_type: "relatedLink"`, whereas the schema defines an anonymous array of objects (which defaults to expecting `_type: "object"`).

#### `process-faq-block`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/seo/process-faq-block.ts`
*   **Discrepancies:**
    *   **Missing Field Mapping:** The parser completely omits `padding` in the mapped block.
    *   **Child Type Mismatch:** The parser generates items in the `faqs` array without a `_type` field, whereas the schema defines an anonymous array of objects (which defaults to expecting `_type: "object"`).

---

### 13. Advanced / Other Blocks

#### `flexible-builder`
*   **Schema Path:** `Sanity-clean/studio/schemas/blocks/flexible-builder.ts`
*   **Discrepancies:**
    *   **Completely Unsupported:** The parser does not have any mapping logic for `flexible-builder`. It falls back to the generic parser output, adding invalid properties like `title` and `body` (which do not exist in the schema) and failing to parse `layout` and `columns`.

---

## Actionable Steps for Engineering Agent (To Fix the Worker)

To make the parser fully compliant with the schemas in `Sanity-clean`, perform the following steps inside `apps/worker/src/markdown-to-portable-text.ts`:

1.  **Fix Section Padding Type globally:**
    *   Update `makePadding()` to return `_type: "section-padding"` (instead of `"sectionPadding"`).
2.  **Add `padding` to all omitted blocks:**
    *   Inject `padding: makePadding()` in: `section-header`, `carousel-1`, `carousel-2`, `logo-cloud-1`, `highlights-block`, `reviews-block`, `quote-spotlight-block`, `micro-badges-block`, `related-links-block`, and `process-faq-block`.
3.  **Correct Type Names / Casing globally:**
    *   Rename children objects inside arrays from camelCase to match the kebab-case schema:
        *   `splitCard` $\rightarrow$ `split-card`
        *   `splitInfo` $\rightarrow$ `split-info`
        *   `gridCard` $\rightarrow$ `grid-card`
        *   `pricingCard` $\rightarrow$ `pricing-card`
        *   `gridPost` $\rightarrow$ `grid-post`
4.  **Rename Grid Row Field:**
    *   In `grid-row` mapping, rename the output field `cards` to `columns`.
5.  **Remove Padding from Hero Blocks:**
    *   Delete the unconditional `padding: makePadding()` mapping from both `hero-1` and `hero-2`.
6.  **Convert UI Icons from Strings to Objects:**
    *   Update the parser to transform `uiIcon` string values (e.g. `"zap"`) into the proper structure expected by `ui-icon` fields: `{"provider": "lu", "name": "zap"}`.
7.  **Address Anonymous Array Objects (Type `object`):**
    *   Change the generated `_type` property to `"object"` for the child items in `eeat-block` (`points`), `metrics-rail-block` (`items`), `micro-badges-block` (`badges`), `related-links-block` (`links`), and `process-faq-block` (`faqs`).
8.  **Complete Missing Field Mappings:**
    *   **`service-types-block`:** Update the parser to map the `price` and `link` fields for each service type.
    *   **`reviews-block`:** Implement a parse-structured string parser for reviews to map the required `reviews` array.
    *   **`hero-vercel`:** Map the `cards` array to support sub-feature cards.
9.  **Link Validation Fix:**
    *   Adjust `makeLink` to force `isExternal: true` whenever `href` is present but `internalLink` cannot be resolved, ensuring the link satisfies the schema's validation requirement.
