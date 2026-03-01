# Design: Fantasy Homerun Tracker - Landing Page (Week 7)

## Project Overview
Fantasy Baseball PWA landing page redesigned with vintage Cubs-inspired aesthetic and refined animations. Launched February 23, 2026.

## Design System

### Color Palette
- **Cubs Blue (Primary Background)**: `#003366` (navy), `#004d99` (royal blue) - Wrigley Field authentic vintage blue
- **Cubs Red (Accent)**: `#DC1141` - Classic Cubs scoreboard red
- **Cream/Off-White (Text)**: `#FFEFD5`, `#FFF5E6` - Vintage scoreboard cream aesthetic
- **Dark Scoreboard**: `#1a1a1a` to `#0d0d0d` - Classic scoreboard black background
- **Accents**: Rivets (`#666`), gradient overlays, glowing text effects

### Typography
- **Font Family**: Courier Prime (monospace) - Classic retro scoreboard font
- **Heading (Main Title)**:
  - Size: `text-6xl md:text-7xl` (96-112px responsive)
  - Weight: Black (font-black)
  - Spacing: `0.08em` letter-spacing
  - Transform: UPPERCASE
- **Subtitle**:
  - Size: `text-5xl md:text-6xl` (80-96px responsive)
  - Weight: Black
  - Spacing: `0.08em` letter-spacing
- **Tagline**: `text-xl md:text-2xl` with lighter weight
- **Button**: `text-lg` font-bold with `0.05em` letter-spacing

## Animation System

### Core Keyframes (in `app/globals.css`)

1. **scoreboardGlow** (3s infinite)
   - Pulsing glow on main titles (FANTASY, HOMERUN TRACKER)
   - Cream text shadow with red accent shadow
   - Glows outward and back with multiple text-shadow layers
   - Creates vintage neon bulb effect

2. **flicker** (0.15s infinite)
   - Subtle opacity flicker effect (never drops below 0.92 opacity)
   - Used for text elements to simulate vintage scoreboard bulbs
   - Very subtle to keep refined feel

3. **scoreboardSlideIn** (1.2s cubic-bezier animation)
   - Main scoreboard frame entrance animation
   - Slides up from below with slight scale (0.95 → 1.0)
   - Smooth, purposeful deceleration curve

4. **bulletBounce** (6s infinite ease-in-out)
   - Animated baseball accent elements
   - Combines vertical bounce (0 to -20px) with 360° rotation
   - Creates playful, vintage movement
   - Used on baseball spheres at top-right and bottom-left

5. **shimmer** (4s infinite ease-in-out)
   - Decorative element opacity pulse (0.4 → 1.0 → 0.4)
   - Applied to circular badges in corners
   - Creates subtle backdrop glow effect

6. **subtleGlow** (2.5s infinite ease-in-out)
   - Button glow animation
   - Outer box-shadow and inset shadow pulse
   - Red glow outward, cream glow inward
   - Creates press-ready, interactive feel

## Component Structure

### Page Layout (app/page.tsx)
Main scoreboard-inspired landing with vintage Cubs colors, animated glow effects on titles, bouncing baseball accents, and interactive sign-in button.

## Key Design Decisions

### 1. Cubs Blue + Cream Over Modern Gradients
- **Why**: Authenticity to Wrigley Field vintage scoreboard aesthetic
- **Colors**: Dark navy to royal blue gradient background, cream/off-white text

### 2. Monospace Courier Prime Font
- **Why**: Scoreboard text must feel retro and mechanical
- **Implementation**: Applied to all titles, uppercase transform, generous letter-spacing (0.08em)

### 3. Text Glow as Primary Animation
- **Why**: Vintage scoreboards had glowing bulbs
- **Implementation**: Multi-layered text-shadow with cream and red colors, 3s cycle time

### 4. Slide-In Scoreboard Frame
- **Why**: The scoreboard should feel like it's coming to life
- **Implementation**: 1.2s entrance animation with slight scale and opacity change

### 5. Baseball Bounces as Accent Movement
- **Why**: Adds personality and motion without overwhelming the page
- **Implementation**: 6s rotation + vertical bounce cycle on baseball elements

### 6. Decorative Rivets & Beveled Edges
- **Why**: Vintage scoreboard has physical dimension
- **Implementation**: Small circular elements at corners (2x2px), layered box-shadows for depth

### 7. Cream Stripes Top & Bottom
- **Why**: Real scoreboard frames have decorative stripe borders
- **Implementation**: 12px gradient bars with cream color

### 8. Button with Interactive Glow
- **Why**: Primary CTA should feel inviting and interactive
- **Implementation**: Animated box-shadow, 2.5s glow cycle, mouse hover scale effect

### 9. Minimal Field Background
- **Why**: Baseball context without dominating the design
- **Implementation**: 5% opacity, overlay blend mode

### 10. Client-Side Auth Check
- **Why**: Seamless redirect for authenticated users
- **Implementation**: useSession hook with useEffect redirect to /dashboard

## Responsive Design

- **Mobile (< 768px)**: Title sizes 96px, responsive padding
- **Tablet/Desktop (>= 768px)**: Title sizes 112px, expanded spacing, max-w-3xl constraint

## Files Modified

1. **app/page.tsx**:
   - Converted to client component ("use client" directive)
   - Cubs blue background gradient
   - Scoreboard frame with beveled edges
   - All animation classes integrated
   - Baseball accent elements
   - Interactive button with hover effects
   - Auth redirect logic

2. **app/globals.css**:
   - Added scoreboardGlow keyframe (3s pulse)
   - Added scoreboardSlideIn keyframe (1.2s entrance)
   - Added bulletBounce keyframe (6s rotation + bounce)
   - Added shimmer keyframe (4s opacity pulse)
   - Added subtleGlow keyframe (2.5s button glow)
   - Added animation utility classes

## Performance Notes

- Animations use GPU-accelerated `transform` and `opacity`
- No layout shifts during animations
- CSS animations in globals.css for reusability
- Responsive gradients optimize for all screen sizes

## Browser Compatibility

- **Modern Browsers**: Full CSS animation support (Chrome, Firefox, Safari, Edge)
- **Fallbacks**: Static styling works without animation support
- **Performance**: Smooth 60fps animations on all modern devices

---

**Last Updated**: February 23, 2026
**Status**: Ready for Testing (Week 7)
