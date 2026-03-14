# Stellar Design System v1.0
## Canonical Visual Language Reference
> **Purpose**: This document defines the complete design language for Stellar Consults.
> Every website section, dashboard, portal, presentation, and brand artifact should
> reference this spec. If it can't be repeated or explained, it is not finished.
---
## 1. BRAND IDENTITY
**Name**: Stellar Consults
**Tagline**: Your Medical and Dental Business Partners
**Aesthetic**: Observatory intelligence meets editorial luxury
**Logo**: Stylized crescent moon in white/gray on coral-to-purple gradient
**Tone**: Cinematic, precise, atmospheric, confident
### What Stellar Is
- Smoked architectural glass, not bright frosted acrylic
- Editorial luxury, not startup SaaS template
- Precision instruments, not decorative effects
- Restrained confidence, not flashy promotion
- Dark, moody, layered depth
- Bespoke design system
### What Stellar Is NOT
- Generic glassmorphism (heavy blur + rainbow gradients)
- Dribbble-style UI kit demos
- Neon glow clusters
- Obvious AI-generated template layouts
- Equal-weight card carousels with emoji icons
- Gimmicky sci-fi with literal space imagery
---
## 2. COLOR SYSTEM
### Primary Brand Colors
| Token | Hex | Usage |
|---|---|---|
| `--stellar-coral` | #E07A5F | Brand primary, logo gradient start |
| `--stellar-purple` | #7C5CBF | Brand secondary, logo gradient end |
| `--stellar-headline` | #D4967D | Headline accent text, emphasis |
| `--stellar-sage` | #495A58 | Supporting accent, body emphasis |
| `--stellar-dark` | #303636 | Dark accent, rich text |
| `--stellar-warm-bg` | #E5E3DC | Light mode background |
### Extended Palette (Derived)
| Token | Hex / Value | Usage |
|---|---|---|
| `--stellar-copper` | #C4856C | Glyph strokes, line details |
| `--stellar-copper-muted` | rgba(196,133,108,0.6) | Overlines, labels |
| `--stellar-obsidian` | #1A1E1E | Dark mode primary background |
| `--stellar-charcoal` | #232828 | Dark mode secondary surface |
| `--stellar-slate` | #2C3232 | Dark mode tertiary surface |
| `--stellar-bone` | #E8E4DB | Primary text on dark |
| `--stellar-ash` | rgba(229,227,220,0.07) | Subtle surface tints |
### Color Philosophy
- **Discipline over variety**: Limit active accent colors to 2 per composition
- **Warm copper/coral** is the primary accent on dark surfaces
- **Purple** appears sparingly: ambient glow, gradient endpoints, not as text
- **Glow is selective**: One warm ambient source per viewport, not per card
- Avoid: excessive color, rainbow blurs, neon, bright saturated accents
---
## 3. GLASS MATERIAL SYSTEM
This is the core visual language. Glass in Stellar is **smoked architectural glass**,
not the typical "frosted acrylic" of standard glassmorphism.
### Glass Backgrounds (by depth)
```css
--glass-bg-primary:   rgba(26, 30, 30, 0.65);   /* Hero panels */
--glass-bg-secondary: rgba(35, 40, 40, 0.45);   /* Medium panels */
--glass-bg-tertiary:  rgba(44, 50, 50, 0.30);   /* Supporting modules */
```
### Glass Borders
```css
--glass-border-strong: rgba(229, 227, 220, 0.08);  /* Default panel edge */
--glass-border-subtle: rgba(229, 227, 220, 0.04);  /* Tertiary dividers */
--glass-border-accent: rgba(212, 150, 125, 0.12);  /* Hover state, active */
```
### Blur Values
```css
--glass-blur-heavy:  40px;   /* Primary surfaces */
--glass-blur-medium: 24px;   /* Standard panels */
--glass-blur-light:  12px;   /* Overlays, tooltips */
```
### Glass Panel Construction (required layers)
Every glass panel needs three layers to achieve the smoked effect:
1. **Base**: `background` + `backdrop-filter: blur()` + `border`
2. **Reflection** (::before): Diagonal gradient simulating light catch
   ```css
   background: linear-gradient(
     135deg,
     rgba(255,255,255,0.04) 0%,
     rgba(255,255,255,0.01) 40%,
     rgba(255,255,255,0) 60%
   );
   ```
3. **Refraction band** (::after): Thin top edge highlight
   ```css
   /* Centered on top edge */
   height: 1px;
   background: linear-gradient(
     90deg, transparent,
     rgba(255,255,255,0.06),
     rgba(255,255,255,0.02),
     transparent
   );
   ```
### Elevation / Shadows
```css
--shadow-panel:
  0 1px 2px rgba(0,0,0,0.3),
  0 4px 16px rgba(0,0,0,0.2),
  inset 0 1px 0 rgba(255,255,255,0.03);
--shadow-panel-hover:
  0 2px 4px rgba(0,0,0,0.35),
  0 8px 32px rgba(0,0,0,0.25),
  inset 0 1px 0 rgba(255,255,255,0.05);
/* Glow: use sparingly, only on hero/primary elements */
--shadow-glow-subtle: 0 0 40px rgba(224, 122, 95, 0.06);
--shadow-glow-accent: 0 0 60px rgba(224, 122, 95, 0.10);
```
### Panel Border Radius
- Hero panels: 20px
- Standard panels: 16px
- Compact modules: 16px
- Buttons / chips: 8px
- Never go above 24px
---
## 4. TYPOGRAPHY
### Font Stack
```css
--font-display: 'Manrope', sans-serif;  /* Headings, labels, metrics */
--font-body: 'Nunito Sans', sans-serif; /* Body text, descriptions */
```
### Type Scale (fluid, using clamp)
| Token | Size | Weight | Use |
|---|---|---|---|
| `--type-hero` | clamp(2.4rem, 4vw, 3.6rem) | 300 | Section titles |
| `--type-section` | clamp(1.1rem, 1.6vw, 1.4rem) | 300–600 | Panel hero titles |
| `--type-panel-title` | clamp(1.05rem, 1.4vw, 1.3rem) | 600 | Panel headings |
| `--type-body` | clamp(0.88rem, 1vw, 0.95rem) | 300 | Body text |
| `--type-caption` | clamp(0.72rem, 0.85vw, 0.8rem) | 300 | Compact descriptions |
| `--type-micro` | 0.68rem | 500 | Proof points, metrics labels |
| `--type-overline` | 0.65rem | 500–600 | Category labels, overlines |
### Typography Rules
- Hero titles: **light weight (300)**, tight letter-spacing (-0.03em), line-height 1.1
- Emphasis within titles: use `<em>` styled as headline color + weight 400, NOT italic
- Overlines: uppercase, wide letter-spacing (0.15–0.2em), copper-muted color
- Body text: weight 300, generous line-height (1.7–1.75), reduced opacity (0.5)
- Never use bold body text. Emphasis comes from color + weight changes in headings.
- Proof points / metrics: Manrope, weight 700, headline color
---
## 5. CELESTIAL / OBSERVATORY VISUAL LANGUAGE
Stellar's brand identity draws from astronomical observation: precision, depth, patience.
This is expressed through **subtle, technical visual cues**, never literal imagery.
### Approved Visual Elements
- **Radial grid arcs**: Faint concentric circles suggesting instrument reticles
- **Constellation points**: Small dots (2–3px) with thin connecting lines
- **Orbital rings**: Slowly rotating concentric circles with varying opacity
- **Signal traces**: Thin horizontal/diagonal gradient lines
- **Technical dividers**: Gradient lines with centered node dots
- **Precision crosshairs**: In glyph design, not as decorative overlays
### Application Rules
- Celestial elements are **atmospheric, not decorative**: they sit in background layers
- Maximum opacity for any celestial element: 0.15 (most should be 0.04–0.08)
- Animation speed should be slow and ambient (15–30 second full rotations)
- One orbital/ring graphic per section maximum
- Constellation dots: sparse (8–15 per viewport), random placement
### What to Avoid
- Literal stars, planets, galaxies, rockets, or space photography
- Bright animated particle systems
- Twinkling effects
- Star field backgrounds
- Anything that reads as "space themed website"
---
## 6. GLYPH / ICON SYSTEM
Replace all emoji, Font Awesome, and icon-library icons with custom SVG glyphs.
### Glyph Style
- **Stroke-only**: No filled shapes (except occasional small node dots)
- **Stroke width**: 1px at 36x36 viewport
- **Color**: `var(--stellar-copper)` at 0.7 opacity, increasing to 1.0 on hover
- **Shapes**: Geometric, precise: circles, lines, rectangles, polylines
- **Feel**: Technical instrument markers, mapping notation, orbital diagrams
- **Size**: 36x36 standard, 28x28 compact contexts
### Glyph Categories (examples)
- **Operations**: Crosshair/reticle with concentric circles
- **Revenue/Finance**: Ascending node path with dot markers
- **People/HR**: Connected node cluster (hub and spoke)
- **Compliance**: Document outline with check indicator
- **Data/Tech**: Grid of connected modules
- **Strategy**: Globe/sphere with intersecting axes
---
## 7. LAYOUT PHILOSOPHY
### Hierarchy Over Repetition
- Never use 6 equal-weight cards in a row
- Every composition needs a clear focal point (hero panel)
- Use asymmetric grids: 1 hero + 2 medium + 3 compact is the default pattern
- Vary internal structure: hero panels get metrics, medium panels get proof points, compact panels stay minimal
### Spacing Rhythm
```css
--space-xs:  0.5rem;   /* Internal padding, tight gaps */
--space-sm:  1rem;     /* Between related elements */
--space-md:  1.5rem;   /* Standard grid gaps */
--space-lg:  2.5rem;   /* Section internal padding */
--space-xl:  4rem;     /* Between major sections */
--space-2xl: 6rem;     /* Page-level section margins */
```
### Content Structure Patterns
**Hero Panel** (primary service):
- Glyph
- Bold statement title (with `<strong>` emphasis)
- Strategic description paragraph
- Proof metrics (2–3 numbers)
**Medium Panel** (secondary service):
- Glyph
- Category label (overline)
- Strategic title (sentence-length)
- Description paragraph
- Single proof point with divider
**Compact Panel** (supporting service):
- Glyph + title inline
- Short description (2 sentences max)
- No proof points
### Content Voice
- Strategic, not promotional
- Statements, not feature lists
- Confident, not aggressive
- Precise, not verbose
- "We build" > "We offer"
- "Architecture" > "Solutions"
- "Discipline" > "Best practices"
---
## 8. MOTION
### Easing Curves
```css
--ease-glass: cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Panel transitions */
--ease-reveal: cubic-bezier(0.16, 1, 0.3, 1);         /* Scroll reveals */
```
### Duration Scale
```css
--duration-fast:    0.2s;   /* Hover color changes */
--duration-base:    0.4s;   /* Panel hover, state changes */
--duration-slow:    0.8s;   /* Scroll reveal animations */
--duration-ambient: 20s;    /* Background orbital rotation */
```
### Animation Rules
- Scroll reveal: translateY(20px) + opacity, with staggered delays (0.1s increments)
- Hover: border-color change + subtle translateY(-2px) + shadow upgrade
- Ambient: slow rotation only, no bouncing, pulsing, or attention-grabbing motion
- Never animate text color, font size, or layout shifts
- All motion respects `prefers-reduced-motion` (disable ambient + reduce reveals)
---
## 9. RESPONSIVE BEHAVIOR
### Breakpoints
- Desktop: 769px and above (asymmetric grid active)
- Mobile: 768px and below (single column stack)
### Mobile Adaptations
- Hero panel: stack content above visual (flex-direction: column)
- Compact row: convert 3-column to single column
- Section padding reduces from 6rem/2.5rem to 4rem/1rem
- Type scale handles this via clamp() values
- Glass blur can be reduced on mobile for performance
---
## 10. SQUARESPACE IMPLEMENTATION NOTES
- All code goes in Code Blocks (not code injection for section-level components)
- Self-contained: CSS in `<style>`, JS in `<script>`, no external dependencies
- Google Fonts loaded via `<link>` in the code block's `<style>` section
- Use `!important` sparingly and only when Squarespace's CSS overrides conflict
- Test at both 7.0 and 7.1 template constraints
- Keep JS minimal: IntersectionObserver for reveals, simple DOM manipulation only
---
## 11. APPLYING THIS TO DASHBOARDS + PORTALS
The same design tokens apply to the Stellar OPS Portal and any internal tools:
### Dark Mode Dashboard
- Background: `var(--stellar-obsidian)`
- Card surfaces: Use the glass panel system with appropriate depth
- Data visualization: coral for primary series, sage for secondary, purple sparingly for tertiary
- Table rows: alternate between `transparent` and `var(--stellar-ash)`
- Active/selected states: `var(--glass-border-accent)` border
### Light Mode (if needed)
- Background: `var(--stellar-warm-bg)` (#E5E3DC)
- Glass panels: invert to `rgba(255,255,255,0.6)` with darker borders
- Text: `var(--stellar-dark)` (#303636) primary
- Same accent colors, adjusted opacity
### Shared Between Website + Dashboard
- Same font stack (Manrope + Nunito Sans)
- Same glyph system
- Same border radius values
- Same spacing rhythm
- Same motion curves
- Same color tokens
---
*Last updated: March 2026*
*Maintained by: Stellar Consults design system*
