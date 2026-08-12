---
name: Ecological Institutionalism
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c18'
  on-surface-variant: '#3f4942'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#6f7a71'
  outline-variant: '#bfc9c0'
  surface-tint: '#186c45'
  primary: '#005131'
  on-primary: '#ffffff'
  primary-container: '#176b45'
  on-primary-container: '#99e9b9'
  inverse-primary: '#88d7a8'
  secondary: '#3e6753'
  on-secondary: '#ffffff'
  secondary-container: '#c0edd4'
  on-secondary-container: '#446d59'
  tertiary: '#3a4942'
  on-tertiary: '#ffffff'
  tertiary-container: '#516159'
  on-tertiary-container: '#cadbd2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a4f4c3'
  primary-fixed-dim: '#88d7a8'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#c0edd4'
  secondary-fixed-dim: '#a4d0b8'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#264e3c'
  tertiary-fixed: '#d5e7dd'
  tertiary-fixed-dim: '#b9cbc1'
  on-tertiary-fixed: '#0f1e19'
  on-tertiary-fixed-variant: '#3a4a43'
  background: '#fbf9f3'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  touch-target: 44px
---

## Brand & Style

This design system establishes a bridge between the majestic natural heritage of Venezuela and the administrative efficiency of a commercial entity. The brand personality is **authoritative yet organic**, professional, and deeply grounded in its environmental context. It avoids the coldness of traditional government interfaces by adopting a **Modern Corporate** style infused with earthy tones.

The target audience includes commercial concessionaires, administrative staff, and park visitors. The UI should evoke a sense of **stewardship and reliability**, utilizing high-quality whitespace, crisp iconography, and a structured layout that feels as organized as a well-managed nature reserve.

## Colors

The palette is derived from the lush vegetation and sandy terrain of Venezuelan national parks. 

- **Primary & Secondary:** Used for high-level branding, navigation headers, and primary actions.
- **Neutral/Background:** The "Arena" (#F7F5EF) shade should be used for large surface areas to reduce eye strain compared to pure white.
- **Semantic States:** Integrated across the platform for immediate cognitive recognition of financial and administrative statuses. 
- **Status Tokens:** Use these colors for chips, badges, and indicator dots. Text within status chips should use high-contrast variants (e.g., White text on Primary, or Primary text on Light Support Green).

## Typography

The choice of **Manrope** provides a geometric yet warm aesthetic that scales perfectly from dense administrative tables to large environmental headlines. 

- **Hierarchy:** Use `display-lg` exclusively for landing pages or dashboard overviews. 
- **Readability:** All body text should adhere to `body-md` for optimal legibility in data-heavy views.
- **Labels:** Use `label-sm` with its uppercase transformation for table headers and secondary metadata to create clear visual distinction.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **Rhythm:** A 4px baseline grid ensures vertical consistency. 
- **Touch Targets:** No interactive element (buttons, links, inputs) should have a height or width smaller than `44px` to ensure accessibility in outdoor environments or mobile usage.
- **Density:** Dashboards should maintain `lg` (24px) padding between major modules to prevent the UI from feeling cluttered, reinforcing the "clean/open" brand pillar.

## Elevation & Depth

To maintain a modern, institutional look, the design system uses **Tonal Layers** combined with very subtle **Ambient Shadows**.

1.  **Level 0 (Base):** Arena (#F7F5EF). Used for the main background.
2.  **Level 1 (Cards/Surface):** White (#FFFFFF). Used for main content containers. Elevation is indicated by a 1px border (#D8DED9).
3.  **Level 2 (Hover/Active):** White (#FFFFFF) with a soft shadow: `0px 4px 12px rgba(40, 51, 46, 0.08)`.
4.  **Level 3 (Modals/Popovers):** White (#FFFFFF) with a deep shadow: `0px 12px 32px rgba(40, 51, 46, 0.12)`.

Avoid heavy gradients. Depth should feel like physical paper or cards resting on a desk.

## Shapes

The shape language is friendly and modern, moving away from sharp, aggressive corners to reflect the organic nature of parks.

- **Standard Elements:** Buttons, Input fields, and small cards use `rounded` (0.5rem / 8px).
- **Major Containers:** Large dashboard widgets and profile sections use `rounded-lg` (1rem / 16px).
- **Status Pills:** Status indicators and chips use `rounded-xl` (1.5rem / 24px) or a full pill shape to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Background #176B45, Text #FFFFFF. 
- **Secondary:** Background #DDEFE5, Text #123C2B.
- **Outlined:** Border 1px #D8DED9, Text #28332E.
- **Min Height:** 44px. 

### Inputs & Forms
- **Resting:** Border 1px #D8DED9, Background #FFFFFF.
- **Focus:** Border 2px #176B45.
- **Labels:** Always visible above the field using `label-md`.

### Status Badges (Chips)
- Use the status tokens defined in the Colors section. 
- Apply a 10% opacity of the status color for the background and 100% opacity for the text to create a "soft badge" look, except for "Primary" actions which can be solid.

### Icons
- Use **Lucide** (linear, 2px stroke width).
- Icons should be sized at 20px within a 24px bounding box for alignment with text.

### Cards
- White background, 1px #D8DED9 border, and `rounded-lg` (16px) corners. 
- Internal padding should be `lg` (24px).