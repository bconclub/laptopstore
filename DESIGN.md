---
name: Retail Precision
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006399'
  primary: '#006195'
  on-primary: '#ffffff'
  primary-container: '#007abb'
  on-primary-container: '#fdfcff'
  inverse-primary: '#94ccff'
  secondary: '#705d00'
  on-secondary: '#ffffff'
  secondary-container: '#fcd400'
  on-secondary-container: '#6e5c00'
  tertiary: '#5d5c59'
  on-tertiary: '#ffffff'
  tertiary-container: '#767472'
  on-tertiary-container: '#fbffe7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#94ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004a74'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#e5e2de'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1c1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Work Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Work Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for a high-trust, high-efficiency tech retail environment. The brand personality is dependable, expert, and accessible, catering to tech-savvy professionals and casual consumers alike. 

The aesthetic follows a **Corporate Modern** direction with a focus on functional clarity. It leverages the high-energy electric blue and bright yellow of the logo to create a vibrant yet organized shopping experience. The style emphasizes structured layouts, clear information hierarchy, and a "spec-first" approach to product presentation, ensuring that users feel they are interacting with a specialized authority in laptop hardware.

## Colors

The palette is anchored by "Electric Blue" (#0081C5), used for primary actions, navigation headers, and brand reinforcement. The "Logo Yellow" (#FFD700) serves as a high-visibility accent color, reserved exclusively for calls-to-action (CTAs) like "Add to Cart," promotional banners, and highlighting key technical advantages.

The default mode is **Light**, utilizing a cool-toned neutral scale to maintain a "clean room" tech aesthetic. Darker slate tones are used for text and iconography to ensure WCAG AA compliance against the white and yellow backgrounds.

## Typography

This design system utilizes **Work Sans** across all levels to reinforce a professional, versatile, and grounded feel. The typeface’s optimized legibility at small sizes is critical for displaying dense technical specifications.

Headlines use heavier weights (600-700) to create a strong vertical rhythm. Labels and small metadata should utilize the Medium weight with a slight letter-spacing increase to maintain clarity on high-resolution displays. Technical data points should be set in `body-md` with consistent alignment for easy comparison.

## Layout & Spacing

The system employs a **Fluid Grid** model within a maximum container width of 1280px. A 12-column structure is used for desktop, collapsing to 4 columns on mobile devices. 

Spacing is based on an 8px linear scale. For retail listing pages, a tighter 16px gutter is permitted between product cards to increase information density, while editorial content and landing pages should utilize 24px or 32px gaps to provide more "breathability." Product detail pages must prioritize a 2-column split (Media vs. Specs) on desktop to keep critical purchase information above the fold.

## Elevation & Depth

Depth is primarily communicated through **Tonal Layers** and **Low-Contrast Outlines**. Surfaces should remain flat and white, with subtle 1px borders (#E2E8F0) used to define product cards and input containers.

Shadows are used sparingly to indicate interactivity. A "soft-lift" shadow (8px blur, 4% opacity black) is applied only when a user hovers over a product card or opens a dropdown menu. This keeps the interface looking precise and avoids the cluttered feel often found in discount retail sites. Modal overlays should use a 40% opacity tint of the secondary brand color to keep the brand present even in utility states.

## Shapes

The shape language reflects the industrial design of modern laptops: precise, slightly softened, and functional. All standard components like buttons, input fields, and cards utilize a **0.5rem (8px)** corner radius. 

For tags and "In Stock" indicators, use a fully rounded **Pill-shape** to differentiate them from actionable buttons. Product imagery should always be contained within rounded-corner frames to match the UI components.

## Components

- **Buttons**: The Primary CTA (e.g., Buy Now) uses a high-contrast Yellow background with Black text. Secondary actions use the Electric Blue with White text. Outlined buttons are reserved for tertiary actions like "Compare" or "View Specs."
- **Input Fields**: Modern, minimalist fields with a 1px border. On focus, the border transitions to Electric Blue with a subtle 2px outer glow in the same color.
- **Product Cards**: Minimal elevation. Includes a large image area, price in bold Electric Blue, and a clear Yellow "Add" button that appears on hover.
- **Chips/Badges**: Used for "New," "Sale," or technical specs (e.g., "16GB RAM"). Use light blue backgrounds with dark blue text for technical specs, and vibrant Yellow for promotional badges.
- **Lists**: Data-heavy tables for specifications should use zebra-striping with the neutral background color to ensure readability across wide screens.
- **Checkboxes & Radios**: Standard browser-native aesthetics but themed with Electric Blue for the checked state.
---

## Implementation notes (codebase mapping)

- Tokens live in `src/app/globals.css` (@theme). Mapping: `brand-*` = Electric Blue scale
  (500 #0081C5, 600 #006195 primary, 700 #004a74), `accent-400/500` = Logo Yellow #FCD400,
  `ink-*` = on-surface scale, `surface` #f1f4f6, `line` #E2E8F0, `space-950` #001D32
  (on-primary-fixed) for dark promotional panels.
- Work Sans loaded via next/font in `src/app/layout.tsx`; both --font-sans and --font-display
  resolve to it.
- Primary CTAs (Add to cart, Book via WhatsApp, hero CTA) = yellow bg + black text, rounded-lg
  (8px). Secondary = brand-600 blue + white. Chips/badges stay pill-shaped.
- Prices render in bold Electric Blue (`src/components/Price.tsx`).
- Spec tables zebra-stripe with `surface` (`src/components/SpecTable.tsx`).
- Dark hero/service/map panels use `.bg-mesh` — Electric Blue radial glows on #001D32,
  a brand-reinforcement exception to the light default (promotional banners per Components spec).
