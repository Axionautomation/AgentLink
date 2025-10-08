# AgentLink Design Guidelines

## Design Approach

**Selected System**: Material Design 3 with custom marketplace optimizations
**Rationale**: AgentLink is a professional utility platform requiring clear information hierarchy, trust-building elements, and mobile-first design for on-the-go agents. Material Design provides robust components for maps, lists, and transactional interfaces while maintaining professional credibility.

**Core Design Principles**:
- **Trust & Credibility**: Professional aesthetic that inspires confidence in financial transactions
- **Clarity Over Decoration**: Information-dense layouts with clear hierarchy
- **Mobile-First Efficiency**: Optimized for agents working in the field
- **Spatial Awareness**: Map-centric design supporting location-based job discovery

---

## Color Palette

**Brand Identity**:
- Primary Orange: `25 95% 55%` - Energetic, professional, action-oriented
- Primary Dark: `25 85% 45%` - Buttons, interactive elements
- Primary Light: `25 100% 97%` - Subtle backgrounds, cards

**Neutrals**:
- Background Light: `0 0% 99%`
- Background Dark: `220 15% 10%`
- Surface: `0 0% 100%` (light) / `220 15% 15%` (dark)
- Text Primary: `220 15% 15%` (light) / `0 0% 95%` (dark)
- Text Secondary: `220 10% 45%`

**Semantic Colors**:
- Success (Job Complete): `142 76% 36%`
- Warning (Pending): `38 92% 50%`
- Error (Cancelled): `0 84% 60%`
- Info (In Progress): `217 91% 60%`

**Accents** (use sparingly):
- Map Pin Active: `271 81% 56%` - Distinct from orange for job locations
- Trust Badge: `142 76% 36%` - Verified licenses, completion badges

---

## Typography

**Font Stack**:
- Primary: 'Inter' - Clean, highly legible for data and interfaces
- Headings: 'Inter' 600-700 weight
- Body: 'Inter' 400-500 weight
- Monospace: 'JetBrains Mono' for payment amounts, IDs

**Scale**:
- Hero/H1: text-4xl (36px) md:text-5xl (48px)
- H2 (Section): text-2xl (24px) md:text-3xl (30px)
- H3 (Card Title): text-lg (18px) md:text-xl (20px)
- Body: text-base (16px)
- Caption/Meta: text-sm (14px)
- Tiny/Labels: text-xs (12px)

**Hierarchy**:
- Job Fees: Bold, large (text-xl to text-2xl)
- Addresses: Medium weight, text-base
- Time/Date: Regular, text-sm with subtle color
- Agent Names: Semibold, text-base

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4
- Tight spacing: space-y-2
- Loose spacing: space-y-6

**Container Strategy**:
- Max width: max-w-7xl for desktop dashboards
- Mobile: Full width with px-4 padding
- Content cards: max-w-2xl for forms, max-w-4xl for job details
- Map view: Full viewport height minus header

**Grid Systems**:
- Job Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard Stats: grid-cols-2 md:grid-cols-4
- Job Details: Two-column layout (property info | agent actions)

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with logo (left), nav links (center), profile avatar + notifications (right)
- **Mobile**: Bottom tab navigation (Home, Jobs, Messages, Wallet, Profile)
- **Height**: h-16 on mobile, h-20 on desktop

### Cards
- **Job Card**: Elevated shadow, rounded-lg, p-4, with hover:shadow-xl transition
  - Property image (if available) at top, rounded-t-lg
  - Fee badge (top-right, absolute, bg-orange-500 text-white)
  - Address + property type
  - Time window with clock icon
  - Distance indicator with location pin
  - "Claim Job" CTA button
- **Agent Profile Card**: Compact, flex layout with avatar (left), stats (center), rating stars (right)

### Buttons
- **Primary CTA**: bg-orange-500, rounded-lg, px-6 py-3, text-white font-semibold, hover:bg-orange-600
- **Secondary**: border-2 border-orange-500, text-orange-600, hover:bg-orange-50
- **Outline on Images**: backdrop-blur-md bg-white/20 border border-white/40 text-white

### Forms
- **Input Fields**: border-2, rounded-lg, p-3, focus:border-orange-500 focus:ring-2 focus:ring-orange-200
- **Labels**: text-sm font-medium mb-2
- **Validation**: Red border + text-red-600 message below field

### Maps
- **Job Pins**: Custom SVG markers with orange circle + property icon
- **Active Job**: Larger pin with pulsing animation
- **User Location**: Blue circle with accuracy radius
- **Controls**: Floating filter panel (top-right), list/map toggle (top-left)

### Chat
- **Message Bubbles**: Sender (bg-orange-500, text-white, rounded-r-full), Receiver (bg-gray-100, rounded-l-full)
- **Input Bar**: Fixed bottom, border-t, with attachment icon + send button
- **Timestamps**: text-xs text-gray-500, grouped by date

### Status Badges
- **Pending**: bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-xs font-medium
- **In Progress**: bg-blue-100 text-blue-800
- **Completed**: bg-green-100 text-green-800
- **Verified**: Green checkmark icon + "Verified" text

### Payment Elements
- **Earnings Card**: Large text-3xl font-bold for amount, secondary text for pending/available
- **Transaction List**: Table with date, job address, amount (+green/-red), status
- **Escrow Indicator**: Progress bar showing funds held → released

---

## Images

**Hero Section (Landing Page)**:
- Large hero image showing professional real estate agents at modern property
- Image dimensions: 1920x1080, optimized to ~200KB
- Overlay: Gradient from transparent to black (bottom 40%)
- Placement: Full-width, h-screen on desktop, h-[60vh] on mobile
- Content: Centered on overlay with heading + CTA buttons

**Property Images**:
- Job cards: 16:9 aspect ratio, object-cover
- Detail pages: Larger featured image + thumbnail gallery
- Fallback: Placeholder with house icon on orange gradient

**Agent Avatars**:
- Circular, w-12 h-12 on cards, w-24 h-24 on profiles
- Border with verified agents (border-2 border-green-500)

**Trust Elements**:
- Brokerage logos in footer (grayscale, hover:color)
- License verification badges (small icons)
- No decorative imagery in dashboard - focus on data

---

## Accessibility & Dark Mode

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Dark mode: Consistent implementation across all views
  - Form inputs: bg-gray-800 with border-gray-600
  - Cards: bg-gray-800 with subtle border
  - Preserve orange brand color with adjusted luminosity for dark backgrounds
- Focus indicators: 2px orange ring on all interactive elements
- Icon-only buttons include aria-labels

---

## Animation Guidelines

**Minimal, Purposeful Motion**:
- Page transitions: 200ms ease-in-out fade
- Button hover: 150ms transform scale(1.02)
- Job claim: Success checkmark with 300ms spring animation
- GPS check-in: Pulsing location pin (slow, subtle)
- Map pin reveal: Stagger animation when loading jobs (50ms delay each)
- **Avoid**: Unnecessary scroll animations, decorative parallax, auto-playing content