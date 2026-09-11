---
name: Modern Agri-Tech
colors:
  surface: '#f3fcee'
  surface-dim: '#d4ddcf'
  surface-bright: '#f3fcee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6e8'
  surface-container: '#e8f1e2'
  surface-container-high: '#e2ebdd'
  surface-container-highest: '#dce5d7'
  on-surface: '#161e15'
  on-surface-variant: '#414844'
  inverse-surface: '#2a3329'
  inverse-on-surface: '#eaf3e5'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fed255'
  on-secondary-container: '#735a00'
  tertiary: '#3a2000'
  on-tertiary: '#ffffff'
  tertiary-container: '#583300'
  on-tertiary-container: '#d59a58'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#ffe08e'
  secondary-fixed-dim: '#ecc246'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#faba75'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#f3fcee'
  on-background: '#161e15'
  surface-variant: '#dce5d7'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  spacing-4: 0.25rem
  spacing-8: 0.5rem
  spacing-12: 0.75rem
  spacing-16: 1rem
  spacing-20: 1.25rem
  spacing-24: 1.5rem
  spacing-32: 2rem
  spacing-40: 2.5rem
  spacing-48: 3rem
  touch-target-min: 3rem
  touch-target-primary: 3.5rem
  screen-edge-padding: 1rem
  card-inner-padding: 1.25rem
---

## Brand & Style

This design system targets agricultural producers, rural aggregators, and field procurement agents operating under direct outdoor sunlight, variable connectivity, and high-throughput collection points. The aesthetic balances agricultural stewardship with high-precision logistics technology. It communicates reliability, prompt liquidity, physical authority, and clarity.

The visual direction merges **Tactile Utility** with **Grounded Editorial Elegance**:
- **Tactile Utility:** Generously proportioned interactive surfaces (48px–56px minimum touch targets), high-contrast outlines, deep pigment-rich fills, and physical state shifts calibrated for field use, gloved interaction, and rapid outdoor viewing under harsh direct glare.
- **Grounded Editorial Elegance:** Thoughtful typographic pairings of an authoritative, literary serif for titles and grain-grade identifiers, contrasted against an ultra-legible humanist grotesque for data density, weight metrics, and live procurement schedules.
- **Direct Operational Feedback:** Clear semantic indicators for crop grading, payment batches, truck weigh-ins, and crowd control at physical procurement hubs.

## Colors

The palette is anchored in deep vegetal pigments, field-baked grain accents, and warm mineral base layers.

### Brand & Primary Accents
- **Primary Deep Forest:** `#1B4332` (Interactive elements, top app bars, primary brand fills).
- **Deep Forest Dark / Inset:** `#12301F` (Pressed states, active bottom navigation bars, deep container surfaces).
- **Secondary Harvest Gold:** `#C9A227` (Accents, key metrics, pricing highlights, active alerts).
- **Tertiary Warm Straw:** `#DDA15E` (Secondary tags, grain grade badges, progress indicators).

### Neutral & Surface Foundation
- **Deep Soil Ink (Text/Base Dark):** `#1E261D` (Standard body text, prominent figures, headers).
- **Muted Soil Ink:** `#2B3329` (Secondary labels, metadata, de-emphasized titles).
- **Earthy Muted Leaf:** `#52634F` (Borders, inactive toggles, secondary icons, input strokes).
- **Pure White Surface:** `#FFFFFF` (Elevated cards, modal sheets, crisp data containers).
- **Warm Sand Tier 1:** `#FBF9F2` (Default canvas / viewport background).
- **Natural Cream Tier 2:** `#F3EEDD` (Input backdrops, segmented controls, table headers).
- **Subtle Mineral Divider:** `#E3DDC9` (Dividers, light component outlines).

### Queue & Crowd Management Semantic Status
- **Low Queue / Clear Gate:** `#2D7A4D` (Background wash: `#EBF5EF`, Text/Icon: `#195031`) — Rapid intake, drop-off ready.
- **Moderate Queue / Steady Flow:** `#C9A227` (Background wash: `#FCF6E5`, Text/Icon: `#785D08`) — 15–30 minute wait estimation.
- **Heavy Queue / Stalled Gate:** `#B84A28` (Background wash: `#FDF1ED`, Text/Icon: `#7B2810`) — Congested depot; delay reroute suggestion.

## Typography

The type system blends the traditional trust of agricultural production with technical clarity:
- **Headlines (`Newsreader`):** Utilized for editorial page intros, receipt settlement summaries, market commodity headings, and mandi/procurement hub names. It lends gravitas, artisanal legacy, and clear visual relief from continuous tabular data.
- **Body, Inputs & Metrics (`Plus Jakarta Sans`):** Clean, geometric grotesque with open apertures, high x-height, and broad spacing. Designed to remain crisp when viewed on low-cost mobile displays under high ambient outdoor illumination.
- **Numerical Hierarchy:** All crop volumes (kg, quintals), dynamic price ticks (₹/kg, $/cwt), and queue timestamps leverage `Plus Jakarta Sans` with bold/extrabold tabular figure styles to avoid baseline jitter during live pricing refreshes.

## Layout & Spacing

This mobile-first layout prioritizes handheld thumb usability, single-hand verification, and rugged field work.

### Layout Mechanics
- **Grid Architecture:** 4-column fluid layout on compact mobile devices (320px–480px width) with 16px margins and 12px gutters. Scales to an 8-column layout (24px margins, 16px gutters) for tablet-equipped procurement gate operators (481px–840px).
- **Ergonomic Reach:** Core operational CTAs (e.g., "Confirm Weigh-in", "Accept Batch Price", "Select Depot") are pinned to sticky bottom action bars within the natural thumb arc.
- **Spacing Scale:** Built on a rigorous 4px baseline grid (`spacing-4` through `spacing-48`). Component paddings consistently favor `spacing-16` or `spacing-20` to prevent dense optical clutter and mis-taps.

## Elevation & Depth

To preserve legibility under direct natural sunlight, elevation relies primarily on tonal separation and high-definition boundary borders, rather than soft, low-contrast shadows.

- **Surface Tiers:**
  - **Level 0 (Canvas):** `#FBF9F2` — Base screen canvas.
  - **Level 1 (Card & Module Foundation):** `#FFFFFF` paired with a crisp `1.5px solid #E3DDC9` structural border.
  - **Level 2 (Active/Selected Containers):** `#FFFFFF` bordered with `1.5px solid #1B4332`, accompanied by a sharp ambient drop-offset: `0 4px 12px rgba(27, 67, 50, 0.08)`.
  - **Level 3 (Modals, Slide-over Drawers, Gate Selectors):** `#FFFFFF` with `0 8px 24px rgba(30, 38, 29, 0.14)` and a defined top boundary stroke `1px solid #E3DDC9`.
- **Sunlight Mode Guarantee:** Shadows are warm-tinted and dense, never diffuse gray, ensuring containers remain visually distinct on reflective phone glass.

## Shapes

The interface balances organic farm origins with robust industrial tooling through unified bold rounded corners:
- **Default Buttons & Form Fields:** 14px border radius, providing a tactile, pill-adjacent cushion that directs finger placement.
- **Cards, Containers & Metric Panels:** 16px to 20px border radius, eliminating harsh razor edges while remaining structurally contained within small mobile viewports.
- **Status Badges & Live Queue Pills:** Fully circular radii (`9999px`) to immediately isolate state information from interactive rectangles.

## Components

### Buttons & Interactive Targets
- **Primary Button:** Minimum height 56px (`touch-target-primary`). Background `#1B4332`, text `#FFFFFF`, radius 16px, font `label-lg`. Active/Pressed state transitions to `#12301F`.
- **Secondary / Action Button:** Minimum height 52px. Background `#F3EEDD`, border `1.5px solid #52634F`, text `#1E261D`. Pressed state shifts background to `#E3DDC9`.
- **Gold Highlight Action:** Minimum height 56px. Background `#C9A227`, text `#1E261D`, font `label-lg` with `700` weight for high-urgency confirmations ("Sell Now", "Instant Disbursal").

### Chips & Filter Pills
- Height 36px–40px. Border `1px solid #E3DDC9`, background `#FFFFFF`, text `#2B3329`.
- **Selected State:** Background `#1B4332`, text `#FFFFFF`, border `#1B4332`.
- Icons inside chips maintain 18px bounding boxes with 8px horizontal clearance.

### Queue Status Banners & Badges
- **Pill Badge:** Height 28px, inner padding 4px 12px, radius 9999px.
  - **Low Queue:** Fill `#EBF5EF`, border `1px solid #2D7A4D`, text `#195031`.
  - **Moderate Queue:** Fill `#FCF6E5`, border `1px solid #C9A227`, text `#785D08`.
  - **Heavy Queue:** Fill `#FDF1ED`, border `1px solid #B84A28`, text `#7B2810`.
- **Depot Live Stream Card:** Integrates dynamic queue indicator with estimated wait time (`metric-display`) and real-time gate throughput metrics.

### Input Fields & Selectors
- Height 56px. Background `#F3EEDD`, border `1.5px solid #52634F`, text `#1E261D`, radius 14px.
- **Focused State:** Background `#FFFFFF`, border `2px solid #1B4332`, gentle glow offset `0 0 0 3px rgba(27, 67, 50, 0.12)`.
- **Numerical Inputs (Moisture %, Weight kg):** Suffix badge anchored on the right in `#52634F` over `#E3DDC9`.

### Procurement Cards & Quality Receipts
- Background `#FFFFFF`, radius 18px, border `1.5px solid #E3DDC9`, padding 20px.
- Header displays commodity variety (e.g., "Sharbati Wheat - Grade A") in `headline-md` (`Newsreader`), with live unit rate aligned right in `metric-display` (`Plus Jakarta Sans`).
- Footer block hosts dual-pane logistics tags: Gate Slot Time and Queue Status Badge.

### Checkboxes & Radios
- Size 24px x 24px with 48px touch target hit area.
- Unchecked: Border `2px solid #52634F`, background `#FFFFFF`, radius 6px (Checkbox) / 9999px (Radio).
- Checked: Border `2px solid #1B4332`, background `#1B4332`, checkmark/center pip `#FFFFFF`.