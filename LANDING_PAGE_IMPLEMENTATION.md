# Landing Page Implementation - Week 7 Polish & Launch

## Overview
Redesigned the landing page with an animated Cubs head featuring:
- Black solid background
- Grayscale Cubs head (subtle background)
- Animated eyes with team-color stitching (1-second cycle through all 30 MLB teams)
- Animated hat logo with scrolling team logos (synchronized with eye stitching)
- Preserved title, tagline, and sign-in button

## Files Created

### 1. `lib/mlb-teams.ts` (52 lines)
MLB teams data with all 30 teams in alphabetical order:
- Each team has: name, code, hex color, emoji logo
- Exports: MLB_TEAMS array, getTeamColor(), getTeamLogo(), getTeamName()
- Colors match official team branding
- Logos use descriptive emojis (snake for ARI, bear for CHC, pirate flag for PIT, etc.)

### 2. `public/cubs-head.png` (213 KB)
Copied from design inspiration folder:
- Original PNG with Cubs C logo and baseball eyes
- Applied CSS grayscale filter in background layer
- Used as primary visual element on landing page

## Files Modified

### 1. `app/page.tsx` (140 lines)
Converted from server-side to client-side component:
- Added two animated sub-components:
  - `AnimatedEye`: Left/right eyes with synchronized team color stitching
    - Uses conic-gradient to create realistic baseball stitching pattern
    - Border color changes every 1/30 second (33ms intervals)
    - Positioned absolutely over Cubs head image
  - `AnimatedLogo`: Hat logo area with scrolling team logos
    - Border and glow color synchronized with eye stitching
    - Displays current team emoji logo
    - Positioned at top of Cubs head
- Main component:
  - Black background (bg-black)
  - Background Cubs head with 20% opacity and grayscale filter
  - Main Cubs head image (100% opacity) with animated overlays
  - Text content (title, tagline, sign-in button) positioned above/around
  - Session handling: redirects authenticated users to /dashboard
  - Proper hydration with mounted state check

### 2. `app/globals.css` (68 lines)
Added landing page animations:
- `@keyframes stitch-color-cycle`: 30-point keyframe animation cycling through all MLB team colors
  - 1 second total duration per complete cycle
  - Linear progression (3.33% per team)
  - Covers all 30 teams in alphabetical order
- `.animate-stitch`: Utility class for eye animations
- `.animate-logo`: Utility class for logo animations
- Both use CSS custom properties (--team-color) for dynamic color changes

## Animation Details

### Timing
- Duration: 1 second per complete cycle through all 30 teams
- Interval: 1000ms / 30 teams = ~33ms per team
- Speed: Fast and energetic, creates engaging visual effect

### Synchronization
- Both eyes (left and right) cycle through same team at same time
- Hat logo border/glow color matches current eye stitching color
- Hat logo emoji changes to match current team's logo

### Implementation Approach
- Client-side React components with setInterval for precise timing control
- Smooth color transitions using CSS transition properties
- Conic-gradient for realistic baseball stitching appearance
- Dynamic inline styles for color changes (no CSS-in-JS library needed)

## Visual Features

### Eyes (Animated)
- 64px white circles with colored borders
- Realistic stitching pattern using conic-gradient CSS
- Border color synchronized with team cycle
- Subtle glow effect (inset shadow with 40% opacity)
- Smooth 75ms color transitions

### Hat Logo (Animated)
- 80px circular area with semi-transparent white background
- Colored border matching current team
- Team-colored glow effect (80% opacity)
- 40px emoji logo in center
- Positioned absolutely at top of Cubs head

### Background
- Solid black background (no gradient)
- Subtle background Cubs head at 20% opacity with grayscale filter
- Provides visual depth without distraction

### Text Content
- Title: "Fantasy Homerun Tracker" - 5xl white bold with drop shadow
- Tagline: "Track homeruns. Manage your league. Win the season." - xl gray-300 with drop shadow
- Sign-in button: Indigo-600 with hover effect, positioned below tagline

## Responsive Design
- All elements scale appropriately for mobile and desktop
- Cubs head container: w-80 h-96 (responsive to viewport)
- Text content: max-w-md (readable on all screen sizes)
- Absolute positioning ensures overlays work correctly on all sizes

## Browser Compatibility
- CSS conic-gradient: Supported in all modern browsers (Chrome 79+, Firefox 83+, Safari 16.1+)
- CSS custom properties (--team-color): Universal support
- React 19 with useEffect hooks: All modern browsers
- Fallback behavior: Color changes gracefully degrade on older browsers

## Performance Considerations
- setInterval runs at 33ms intervals for smooth animation
- No heavy computations or re-renders
- CSS transitions handled by GPU (transition-colors duration-75)
- Image optimization: Cubs head PNG (213 KB) is reasonable size
- Build optimization: Turbopack compilation (25% faster than default)

## Testing Checklist
- [x] npm run build succeeds (no errors)
- [x] TypeScript compilation successful for new files
- [x] Cubs head image visible and properly positioned
- [x] Eye colors change smoothly through all 30 teams
- [x] Hat logo border/glow color synchronized with eyes
- [x] Hat logo emoji changes with team cycle
- [x] Text content properly positioned and readable
- [x] Sign-in button clickable and styled correctly
- [x] Session redirect works (authenticated users go to /dashboard)
- [x] Animations start on page load
- [x] Grayscale background layer visible beneath main content
- [x] Responsive on mobile and desktop

## Optional Future Enhancements
- Add pause animation on hover
- Add sound effect on team change (subtle beep)
- Add team name tooltip on hover
- Add particle effects around logo
- Add background music or ambient sounds
- Customize eyes to show game scores
- Add statistics display on team change

## Files Summary
- **Created**: 2 new files (lib/mlb-teams.ts, public/cubs-head.png)
- **Modified**: 2 existing files (app/page.tsx, app/globals.css)
- **Total size**: ~250 KB (mostly image)
- **Code size**: ~300 lines TypeScript/CSS

## How to View
1. Run: `npm run dev` (port 3001)
2. Visit: http://localhost:3001
3. Watch animations cycle through all 30 MLB teams
4. Click "Sign In with Google" to proceed to dashboard
