# Parse Design System

Parse should feel like a precise research instrument: calm, analytical, transparent, and easy to use. The visual system should avoid the oversized, overly rounded, template-like SaaS aesthetic common to generated landing pages.

## 1. Brand principles

### Precise, not cold
Use clear hierarchy, restrained color, and data-oriented typography. The product should feel trustworthy without looking institutional.

### Editorial, not promotional
Headings should read more like a well-designed research product than a startup billboard. Avoid oversized display type, excessive bold weights, and repeated centered marketing statements.

### Transparent by design
The interface should visually reinforce Parse's product promise: natural language goes in; explicit, editable screening logic comes out.

### One accent, meaningful status colors
Indigo is the primary interaction/brand accent. Green and red are reserved for genuine market direction or success/error states, not decoration.

---

## 2. Typography

### Display / headings — Instrument Sans
Use Instrument Sans for page titles, section headings, card titles, and other editorial display text.

- Primary weight: 600
- Secondary emphasis: 500
- Avoid 700+ except in rare, compact labels
- Default tracking on large headings: approximately `-0.02em`
- Keep line-height compact but not compressed

Recommended scale:

| Role | Size | Line height | Weight |
| --- | --- | --- | --- |
| Hero / H1 | 40–56px responsive | 1.06–1.12 | 600 |
| Page H1 | 36–40px | 1.08–1.15 | 600 |
| H2 | 28px | 1.2 | 600 |
| H3 / section | 21px | 1.3 | 600 |
| Card title | 15–18px | 1.35 | 600 |

### Body / UI — Inter
Use Inter for body copy, navigation, buttons, inputs, helper text, tables, and product UI.

- Body: 15–17px, weight 400
- UI labels: 12–14.5px, weight 500–600
- Avoid using display typography inside controls

### Data / technical — JetBrains Mono
Use JetBrains Mono only where monospacing conveys structure or data:

- filter expressions
- ticker symbols
- financial values in dense tables
- step numbers
- technical labels

Do not use mono as decorative body text.

---

## 3. Color

### Neutrals

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#F4F5F7` | App/site background |
| `--color-surface` | `#FFFFFF` | Cards and primary surfaces |
| `--color-surface-alt` | `#FAFBFC` | Secondary surface |
| `--color-border` | `#E6E8EC` | Default borders |
| `--color-border-strong` | `#D4D8DF` | Hover/focus-adjacent borders |
| `--color-ink` | `#15171C` | Primary text |
| `--color-ink-soft` | `#565C67` | Secondary text |
| `--color-ink-faint` | `#68707D` | Muted labels that still need readable contrast |

### Brand / interaction

| Token | Value | Use |
| --- | --- | --- |
| `--color-accent` | `#2C36A8` | Primary actions and links |
| `--color-accent-soft` | `#ECEEFA` | Selected states and focus support |
| `--color-accent-ink` | `#232A85` | Strong accent / hover |

### Semantic

| Token | Value | Use |
| --- | --- | --- |
| `--color-gain` | `#0B8A5B` | Positive market movement / success |
| `--color-loss` | `#C33328` | Negative market movement / errors |

Do not use gain/loss colors as general decorative accents.

---

## 4. Spacing

Base spacing follows a restrained 4/8px rhythm:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 24px
- `--space-6`: 32px
- `--space-7`: 48px
- `--space-8`: 64px

Prefer whitespace over decorative separators. Large sections should generally use 44–64px vertical separation on desktop.

---

## 5. Shape

Parse should be softly structured, not bubbly.

- Small radius: 7px
- Controls: 9–10px
- Cards: 12–14px
- Large panels: 14–16px

Avoid pill shapes unless the component is actually a tag/chip.

Borders should usually carry hierarchy instead of heavy shadows. Shadows, when used, should be subtle and functional.

---

## 6. Components

### Buttons

**Primary**
- Indigo background
- White text
- 40–44px height
- 9–10px radius
- Inter 500–600

**Secondary / neutral**
- White or accent-soft background
- Visible 1px border where needed
- Same height/radius family as primary

**Ghost**
- Transparent background
- Accent text
- Use for navigation-level or low-emphasis actions

Avoid gradients, glow effects, and oversized CTA buttons.

### Cards

- White surface
- 1px neutral border
- 12–14px radius
- Minimal or no shadow
- 16–22px internal padding

Cards should group related information, not serve as decoration.

### Inputs / query bars

- White background
- 1px strong-neutral border
- 10–14px radius
- Focus state uses indigo border plus subtle accent-soft ring
- Body/UI typography remains Inter

### Data tables

- Inter for headers/body labels
- JetBrains Mono for ticker/numeric values where scanning benefits
- Light horizontal rules
- Avoid zebra striping unless density makes it necessary

### Filter chips

- Compact, editable, visually explicit
- Mono reserved for the actual expression/value when useful
- Accent-soft can indicate user-edited/selected state

---

## 7. Layout

### Content width
Marketing and explanatory pages should generally stay near 920–1000px max width.

### Alignment
Default to left alignment for meaningful product/editorial content. Centered typography should be used sparingly.

### Homepage hero
The hero should feel compact and confident, not theatrical.

- Instrument Sans 600
- 40–56px responsive heading
- Max 2–3 lines
- Product demo carries equal visual importance to the headline
- Avoid large empty vertical gaps

### Section hierarchy
Not every section needs a large heading. Mix:

- 21–28px section headings
- small mono/uppercase context labels
- strong card titles

This prevents the repeated “AI landing page section” pattern.

---

## 8. Motion

Motion should explain state changes, not decorate the page.

- 140–300ms for hover, selection, chips, and small UI transitions
- Product demo animation may be slower because it tells a sequence
- Respect `prefers-reduced-motion`
- Avoid parallax, bouncing CTAs, and looping decorative animation

---

## 9. Accessibility

- Maintain WCAG AA contrast for normal text
- Focus-visible states must remain obvious
- Do not encode meaning only through color
- Keep body text at 14.5px or larger for core product surfaces where practical
- Preserve reduced-motion behavior

---

## 10. Logo

Keep the current Parse logo unchanged. Typography updates should not trigger a logo redesign.

The logo may appear with the Parse wordmark, but the symbol itself is treated as a fixed brand asset.

---

## 11. Implementation

Core CSS tokens live in `app/globals.css`.

Use:

```css
font-family: var(--font-display); /* Instrument Sans */
font-family: var(--font-body);    /* Inter */
font-family: var(--font-mono);    /* JetBrains Mono */
```

A temporary migration selector in `globals.css` converts legacy inline `Space Grotesk` declarations to Instrument Sans. New work must not introduce Space Grotesk; existing local display-font constants should be removed opportunistically as components are touched.

## 12. Design review checklist

Before merging a new UI change, confirm:

- Does the page still feel like a research/product tool rather than a generic SaaS template?
- Are headings Instrument Sans and UI/body copy Inter?
- Is hierarchy achieved mostly through type, spacing, and borders rather than decoration?
- Are indigo, green, and red being used intentionally?
- Are corners restrained and consistent?
- Is the content predominantly left-aligned where that improves scanning?
- Does the component have a clear reason to exist?
- Does the UI remain readable and keyboard/focus accessible?
