# Changelog

All notable changes to the Jagad Erza Studio redesign are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — 2026-03-12

### Summary

This update covers a full UI/UX redesign pass across the entire application — dashboard, AI tools, landing page, and sidebar — with the goal of making the interface more modern, visually rich, and consistent while preserving the existing color palette and code structure.

---

## Redesign Sessions

---

### `41539e6` — feat(sidebar): redesign Active Plan card with progress bar and visual hierarchy

**File changed:** `src/components/layouts/app-sidebar.tsx`

**What changed:**
- Converted the plain Active Plan section into a polished card component with a darker background (`var(--bg)`) for contrast against the sidebar surface
- Added a subtle top accent gradient line (`via-primary/50`) at the top of the card
- Redesigned the "Active Plan" label to use `uppercase tracking-wider` for a more structured look
- Refined the plan badge (👑 Basic) with `border border-primary/25 bg-primary/10` styling
- Repositioned the credits number (`text-2xl`) inline with the `creditsRemaining` label for better readability
- **Added a credit usage progress bar** (`h-1.5`, gradient `from-primary to-primary-dark`) showing `150 / 200` usage
- Replaced the gradient Upgrade button with a solid `bg-primary` button with a `Sparkles` icon for consistency with the design system

---

### `c384f3a` — fix(writing-assistant): use h-10 for header height consistency with other AI tools

**File changed:** `src/components/features/writing-assistant/writing-assistant.tsx`

**What changed:**
- Updated both panel headers from `h-[52px]` to `h-10` to match the fixed header height used across all other AI tool pages (Humanizer, Paraphraser, Grammar Checker, AI Detector)
- Ensures visual consistency across the entire AI tools section

---

### `11b0fe2` — fix(writing-assistant): align header divider with fixed h-[52px] on both panels

**File changed:** `src/components/features/writing-assistant/writing-assistant.tsx`

**What changed:**
- Fixed misaligned divider between the Writing Assistant toolbar (left) and the AI Assistant sidebar header (right)
- Root cause: both headers used `py-3` padding, but differing icon sizes (`w-8 h-8` vs `w-7 h-7`) caused inconsistent rendered heights
- Solution: replaced `py-3` with `h-[52px]` fixed height on both headers so the `border-bottom` divider lines up perfectly

---

### `a1de16b` — fix(landing): navbar transition, hero CTA, and Article feature preview

**Files changed:**
- `src/app/[locale]/(landing)/landing-hero.tsx`
- `src/components/landing/product-preview.tsx`
- `src/components/layouts/landing-header.tsx`

**What changed:**

**Navbar transition:**
- Replaced class-based `glass` switching (which caused a hard border pop on scroll) with scroll-progress-based inline styles
- Background opacity, backdrop blur, border-bottom opacity, and box shadow now interpolate smoothly over the first 80px of scroll
- Added `--bg-rgb` and `--border-rgb` CSS variables to both dark and light themes in `globals.css` to support `rgba()` interpolation

**Hero CTA:**
- Replaced the "Learn More" button with a `<Link href="/waiting-list">` button labeled **"Join Waiting List"** with a `Users` icon

**Product Preview (Article feature):**
- Completely replaced the Humanizer mock UI with an **Article Editor** showcase
- New mock UI includes: left sidebar with article list, main rich-text editor with toolbar and inline AI suggestion popup, right AI Chat panel with sample conversation
- Added feature highlights strip: Rich-text editor, Inline AI suggestions, AI chat assistant, Export to PDF/DOCX
- Updated headline to "Write smarter with AI Article Editor."

---

### `37aafdf` — feat(landing): complete SaaS landing page redesign with all sections

**Files changed (11 files, +1,254 lines):**
- `src/app/[locale]/(landing)/page.tsx`
- `src/app/[locale]/(landing)/waiting-list/page.tsx` *(new)*
- `src/components/landing/benefits-section.tsx` *(new)*
- `src/components/landing/bento-grid.tsx`
- `src/components/landing/cta-section.tsx`
- `src/components/landing/how-it-works.tsx` *(new)*
- `src/components/landing/product-preview.tsx` *(new)*
- `src/components/landing/testimonials-section.tsx` *(new)*
- `src/components/landing/use-cases-section.tsx` *(new)*
- `src/components/landing/waiting-list-page.tsx` *(new)*
- `src/components/layouts/landing-footer.tsx`

**What changed:**

**New sections added to Landing Page:**
- **Features Grid** — 8 feature cards (Writing Assistant, Article, AI Chat, Humanizer, Paraphraser, Grammar Checker, AI Detector, Collection) in a clean 4-column layout
- **How It Works** — 4-step explanation with numbered badges, icons, and a horizontal connector line on desktop
- **Benefits** — 2-column layout: left with headline + stats (50K+, 1M+, 4.9★), right with 6 benefit cards
- **Use Cases** — 6 audience cards (Students, Writers, Marketers, Content Creators, Professionals, Teams) with relevant tool tags
- **Product Preview** — Mock browser UI demonstrating the Humanizer tool (later updated to Article)
- **Testimonials** — 6 testimonial cards with star ratings, avatar initials, and social proof summary

**Updated sections:**
- **CTA Section** — Dual CTA: "Get Started" + "Join Waiting List", with social proof strip below
- **Footer** — Expanded to 5 columns (Brand, Product, Tools, Resources, Legal) with social media icons and status indicator

**New page — Waiting List (`/waiting-list`):**
- Two-column layout: info panel (left) + form card (right)
- Info panel: badge, headline, 4 benefit checklist, tool preview, social proof
- Form: Name, Email, Use Case (optional dropdown)
- Real-time validation, loading state, and success confirmation state with user's name and email

---

### `5258791` — fix: align panel headers with fixed h-10 height across all split-panel pages

**Files changed:**
- `src/components/features/ai-detector/ai-detector.tsx`
- `src/components/features/grammar-checker/grammar-checker.tsx`
- `src/components/features/humanizer/humanizer.tsx`
- `src/components/features/paraphraser/paraphraser.tsx`

**What changed:**
- Fixed misaligned panel headers (Input / Output / Analysis / Suggestions) across all split-panel AI tool pages
- Root cause: `py-2.5` padding caused inconsistent rendered heights between left and right panel headers
- Solution: replaced `py-2.5` with `h-10` fixed height on all panel headers so border-bottom lines are perfectly aligned

---

### `177d5d8` — feat: significantly redesign 6 pages with modern visual improvements

**Files changed (6 files, +259 lines):**
- `src/components/features/ai-detector/ai-detector.tsx`
- `src/components/features/collection/collection-page.tsx`
- `src/components/features/grammar-checker/grammar-checker.tsx`
- `src/components/features/humanizer/humanizer.tsx`
- `src/components/features/paraphraser/paraphraser.tsx`
- `src/components/features/writing-assistant/writing-assistant.tsx`

**What changed (applied consistently across all 6 pages):**

| Element | Before | After |
|---|---|---|
| Toolbar icon | Plain icon | `w-8 h-8 rounded-lg bg-primary/15 border border-primary/25` container |
| Page title | Title only | Title + subtitle below for context |
| Main container | `border-border rounded-lg shadow-sm` | `border-border/70 rounded-xl shadow-xl` |
| Panel headers | Small uppercase label | Full header bar with `bg-background`, dot indicator, label, and status badge |
| Footer action bar | `h-12 bg-surface/30` | `h-14 bg-background` — taller and more contrasted |
| Empty state icon | `w-14 rounded-xl` | `w-16 h-16 rounded-2xl` with border |

**Per-page specifics:**
- **Writing Assistant** — Sidebar chat header with icon container and subtitle; improved empty state with title and description
- **Humanizer** — Full `bg-surface` container, panel headers with dot + Ready badge
- **Paraphraser** — Consistent with Humanizer, output panel Ready badge
- **Grammar Checker** — Suggestion panel header with red issue count badge; empty states with `rounded-2xl`
- **AI Detector** — Score display `text-5xl`; score card with `bg-background`; analysis header with Done badge; sentence analysis section header with accent bar
- **Collection** — Page header with icon container and subtitle; section divider with `border-b`; empty state `rounded-2xl`

---

### `edb3de2` — feat: redesign 6 pages with modern minimalist visual enhancements

**Files changed (6 files, +88 lines):**
- `src/components/features/ai-detector/ai-detector.tsx`
- `src/components/features/collection/collection-page.tsx`
- `src/components/features/grammar-checker/grammar-checker.tsx`
- `src/components/features/humanizer/humanizer.tsx`
- `src/components/features/paraphraser/paraphraser.tsx`
- `src/components/features/writing-assistant/writing-assistant.tsx`

**What changed (initial visual enhancement pass):**
- Toolbar/header bars: added `bg-surface/80 shadow-sm` and left accent border on icon+title
- Main containers: upgraded to `border-border/70 rounded-xl shadow-lg ring-1 ring-border/30`
- Panel labels: added "Input" / "Output" / "Analysis" labels with `uppercase tracking-wider`
- Settings bars: added `bg-background/60 backdrop-blur-sm`
- Empty state icons: upgraded to `rounded-xl bg-primary/10 border border-primary/20`

---

### `2be4218` — feat(dashboard): enhance visual design without changing color palette or structure

**File changed:** `src/app/[locale]/(app)/dashboard/page.tsx`

**What changed:**
- **Hero/Greeting section** — Wrapped in a card with radial gradient from `primary`, dot-grid texture, badge "Erza Studio" with Sparkles icon, and decorative icon on the right
- **Stats cards** — Added colored border per card (blue, green, yellow, purple), top accent line, colored icon container border, and pill-style trend badges with colored backgrounds
- **Article type cards** — Gradient background always visible (not just on hover), left accent line, vertical layout (icon top, text bottom), larger icon container, "Start writing" button with arrow
- **AI Tools cards** — Icon scale animation on hover, "Popular" badge on Writing Assistant, larger rounded icon container
- **Section headers** — "Article Types" and "AI Tools" headings now have a vertical primary accent bar on the left

---

## Design Constraints Maintained Throughout

All changes across every session strictly adhered to the following constraints:

- **Color palette preserved** — No color values were modified. All enhancements use existing CSS variables (`--primary`, `--bg`, `--surface`, `--border-color`, `--text-muted`, etc.) with opacity modifiers
- **Code structure unchanged** — No component hierarchy, props interfaces, state management, API calls, or routing logic was modified
- **Improvements limited to** — Layout, spacing, padding, typography hierarchy, alignment, component arrangement, and visual balance only
- **Design language** — Simple, clean, minimalist, and modern throughout

---

## Files Modified Overview

| File | Sessions |
|---|---|
| `src/app/[locale]/(app)/dashboard/page.tsx` | Dashboard redesign |
| `src/components/features/writing-assistant/writing-assistant.tsx` | 3 sessions |
| `src/components/features/humanizer/humanizer.tsx` | 2 sessions |
| `src/components/features/paraphraser/paraphraser.tsx` | 2 sessions |
| `src/components/features/grammar-checker/grammar-checker.tsx` | 2 sessions |
| `src/components/features/ai-detector/ai-detector.tsx` | 2 sessions |
| `src/components/features/collection/collection-page.tsx` | 2 sessions |
| `src/components/layouts/app-sidebar.tsx` | Active Plan redesign |
| `src/components/layouts/landing-header.tsx` | 2 sessions |
| `src/components/layouts/landing-footer.tsx` | Landing redesign |
| `src/app/[locale]/(landing)/landing-hero.tsx` | Landing redesign |
| `src/app/[locale]/(landing)/page.tsx` | Landing redesign |
| `src/app/[locale]/(landing)/waiting-list/page.tsx` | New page |
| `src/components/landing/bento-grid.tsx` | Landing redesign |
| `src/components/landing/cta-section.tsx` | Landing redesign |
| `src/components/landing/how-it-works.tsx` | New component |
| `src/components/landing/benefits-section.tsx` | New component |
| `src/components/landing/use-cases-section.tsx` | New component |
| `src/components/landing/product-preview.tsx` | New component (updated) |
| `src/components/landing/testimonials-section.tsx` | New component |
| `src/components/landing/waiting-list-page.tsx` | New component |
| `src/app/globals.css` | Added `--bg-rgb`, `--border-rgb` variables |
