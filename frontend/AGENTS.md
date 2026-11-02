<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend UI Design Rules: Anti-AI Slop, Iconography & Pinterest Visual Grounding

These rules govern all frontend UI/UX engineering, layout structuring, component authoring, iconography, and styling within `frontend/`. Every agent and developer must adhere to these standards to ensure interfaces feel expensive, bespoke, and purpose-built for the Sky-Lux luxury enterprise domain.

---

## 1. Visual Research via Pinterest MCP (Mandatory Step 0)

Never improvise or hallucinate a layout or icon layout from default LLM training weights. Before creating new pages, redesigning screens, or drafting complex component groups (dashboards, drawers, tables, metric grids):

1. **Query Pinterest MCP**:
   Call `call_mcp_tool` with `ServerName: "pinterest"`, `ToolName: "pinterest_search"` using targeted, aesthetic-rich queries.
   * *Keywords to combine*: domain terms + aesthetic descriptors + `"ui"` / `"dashboard"` / `"app"` / `"dribbble"`.
   * *Examples*:
     * `"fintech executive dashboard dark green"`
     * `"luxury saas supplier spend analytics table"`
     * `"clean b2b metrics cardless layout typography"`
     * `"minimalist dark emerald champagne gold editorial ui"`
     * `"minimalist enterprise table action icons typography"`
2. **Inspect Previews**:
   Always set `previews: 4` to `8` in `pinterest_search` (or use `pinterest_preview_images` / `pinterest_related_pins`) to visually inspect candidate pins.
3. **Extract 2–3 Concrete Visual Anchors**:
   In your reasoning/proposal, explicitly identify what you are borrowing from the visual reference:
   * *Layout geometry*: e.g., asymmetric hero split, off-center KPI summary bar, single-panel split table.
   * *Surface separation*: e.g., hairline border divider instead of nested cards, alternating subtle background fills.
   * *Iconography & micro-typography*: e.g., naked unboxed action icons, wide tracked uppercase labels, bold tabular metrics with muted currency prefix.

---

## 2. Anti-AI Slop Guardrails (Banned Patterns vs. Positive Targets)

| Dimension | ❌ Banned "AI Slop" Patterns | ✅ Sky-Lux Required Standard |
| :--- | :--- | :--- |
| **Color & Palettes** | Generic purple/indigo neon gradients (`bg-gradient-to-r from-purple-600 to-indigo-600`), random hex codes (`#1a1a1a`, `#4f46e5`). | **Strict Luxury Enterprise Palette**: Use CSS tokens from `globals.css`: Deep Emerald (`--color-primary-950`: `#00382a`, `--ceo-primary-950`: `#082c22`), Champagne Gold accents (`--color-gold`: `#d3a11b`, `--ceo-gold`: `#d4af37`), and crisp warm neutral background (`--color-bg`: `#f8f9f8`). |
| **Card Architecture** | **Card-inside-card-inside-card** fatigue (every section, row, and stat wrapped in its own bordered rounded box with drop shadow). | **Surface & Divider Architecture**: Use flat, breathable sections. Separate information with subtle 1px dividers (`border-[var(--color-divider)]`), hairline rules, or subtle background tonal shifts (`bg-[var(--color-surface-muted)]`) instead of nesting cards. |
| **Iconography** | **"Icon-in-a-colored-circle" slop** (wrapping every metric or list item with a bright pastel circular badge `rounded-full bg-blue-100 p-3 text-blue-600`), mixing random icon packs, oversized icons. | **Naked, Purposeful Outlined Icons**: Single library `@ant-design/icons` with `*Outlined` style. Naked positioning with optical alignment (`gap-1.5`), muted neutral tints (`text-[var(--color-text-muted)]`), tight sizing (14px–16px). |
| **Bento & Layouts** | Monotonous 3×3 bento grids where every tile has identical dimensions, a circular icon background, and an icon-title-number stack. | **Intentional Asymmetry**: Design hierarchy with varying weights (e.g., 2/3 primary trend chart + 1/3 high-priority actionable list; wide single-metric bar with inline status pills). |
| **Elevation & Shadows** | Heavy floating blur shadows (`shadow-xl`, `shadow-2xl`) on static cards. | **Crisp Hairline Elevation**: Flat surfaces with 1px border (`border-[var(--color-border)]`) or micro-ambient shadow (`shadow-xs` / `shadow-sm`). Elevation is reserved strictly for overlays, tooltips, popovers, and drawers. |
| **Typography & Numbers** | Default generic font sizes, proportional numbers for metrics that cause column jitter. | **Editorial Precision**: Use `tabular-nums font-mono` for all currencies, percentages, and counters. Use compact micro-headers: `text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase`. |
| **Badges & Tags** | Gimmicky pill tags with random emoji decorations (e.g. `✨ AI Powered ✨`). | **Restrained Status Badges**: Clean, flat micro-badges with semantic soft backgrounds (`--color-success-soft`, `--color-warning-soft`, `--color-danger-soft`) and high-contrast text. |
| **Copy & Content** | Generic placeholder fluff: "Elevate your enterprise with intelligent insights". | **Domain-Accurate Realism**: Realistic executive procurement / spend terms: "Run-rate Variance", "Supplier Concentration", "Contract Adherence", "Fiscal YTD". |

---

## 3. Iconography Standards & Visual Discipline

### A. Single Source of Truth
* **Exclusively use `@ant-design/icons`**. Never install or mix other libraries (`lucide-react`, `heroicons`, `feather`, etc.).
* **No ad-hoc inline SVGs**: Do not paste raw `<svg viewBox="...">` markup into components unless rendering an official company logo asset that has no font icon.

### B. Variant & Weight Consistency
* **Default to `*Outlined`**: (e.g. `UserOutlined`, `SearchOutlined`, `ReloadOutlined`, `DeleteOutlined`, `EditOutlined`, `CheckCircleOutlined`).
* **Reserve `*Filled` strictly for state toggles**: e.g., toggled bookmark/favorite (`StarFilled` vs `StarOutlined`), selected view state, or distinct file-type glyphs (`FileExcelFilled`). Never mix filled and outlined variants arbitrarily in the same navigation bar, table, or button row.

### C. Ban "Icon-in-a-Box / Icon-in-a-Circle" Slop
* **No decorative pastel bubbles**: Do not wrap icons in `rounded-full bg-emerald-100 text-emerald-600 p-2.5` to artificially fill whitespace at the top of cards.
* **Use "Naked" Icons**: Allow the icon to sit directly alongside typography or within an interactive touch target. For interactive icon buttons, use a subtle hover background (`hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-900)] rounded-md transition-colors`) without permanent loud borders or filled backgrounds.

### D. Optical Sizing & Alignment
* **In-line button / action icons**: `text-[14px]` to `text-[15px]` (never exceed `text-[16px]` in data tables or action toolbars).
* **Input field prefixes / suffixes**: `text-[13px]` to `text-[14px]` with `text-[var(--color-text-soft)]`.
* **Badges / compact status indicators**: `text-[11px]` to `text-[12px]`.
* **Empty states / Hero icons**: Maximum `text-[28px]` to `text-[32px]`, styled with muted tone (`text-[var(--color-text-soft)]`), never massive 64px colored blobs.
* **Vertical optical centering**: Always pair with text using `inline-flex items-center gap-1.5` or `gap-2` to prevent baseline misalignment.

### E. The Restraint Test (Zero Visual Noise)
* **High-signal only**: Every icon must aid rapid scanning (e.g., sort arrows, search lens, delete trash can, status checkmark). If removing an icon does not degrade clarity, **omit the icon**. Avoid placing icons in front of every column header or on every standard confirmation button.

---

## 4. Component Integration & Ant Design Harmonization

* **Theme Token Dominance**: All components (both Tailwind and Ant Design) must align with the CSS variables in `frontend/app/globals.css`. Do not inject arbitrary Tailwind colors like `bg-blue-500` or `text-violet-600`.
* **Ant Design Polish**: When using Ant Design components (`Table`, `Drawer`, `Modal`, `Select`), customize them to strip bulky legacy borders or default blue highlights; ensure they inherit `--color-primary-900` for active states and `--color-border` for outlines.
* **Responsive & Density Modes**: Enterprise dashboards must prioritize high information density on desktop screens (compact table padding, tight metric spacing) while remaining cleanly legible on tablet/mobile views.

---

## 5. Pre-Flight Verification Checklist

Before finalizing any frontend task, verify:
- [ ] **Visual Grounding**: Was Pinterest MCP searched for visual reference before layout & component generation?
- [ ] **Icon Discipline**:
  - Are all icons from `@ant-design/icons`?
  - Are they consistently `*Outlined` (unless toggled state)?
  - Are they naked and free from tacky colored circle backgrounds?
  - Are they sized appropriately (14px–16px in tables/actions) and optically centered?
- [ ] **No Card Overload**: Are there any cards nested inside cards? (If yes, flatten or replace with dividers).
- [ ] **Palette Compliance**: Are all colors referencing `var(--color-*)` or `var(--ceo-*)` design tokens?
- [ ] **Tabular Metrics**: Do tables, currencies, and KPIs use `tabular-nums`?
- [ ] **Zero Neon Slop**: Are there any arbitrary purple/indigo gradients or unnecessary glowing blur effects?
