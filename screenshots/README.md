# Screenshot Generation Guide

## Current Status

⚠️ **Placeholder screenshots are currently in use.** These are temporary copies of the app icon and should be replaced with actual screenshots before final store submission.

## Required Screenshots

### Desktop (Wide) - 1920x1080
1. **simulator-wide.png**: Simulator tab showing route preview and active simulation
2. **route-management-wide.png**: Route Management tab with custom route builder and waypoints

### Mobile (Narrow) - 750x1334
1. **simulator-narrow.png**: Mobile view of telematics simulator

## How to Capture Actual Screenshots

### Using Chrome DevTools (Recommended)

1. Open the deployed app: https://vinushbharadwaj-eg.github.io/eg-telematics-simulator/telematics-simulator.html

2. Open Chrome DevTools (F12 or Ctrl+Shift+I)

3. Enable Device Toolbar (Ctrl+Shift+M or click the device icon)

4. **For Wide Screenshots (Desktop)**:
   - Set device to "Responsive"
   - Set dimensions to **1920 x 1080**
   - Navigate to Simulator tab with an active route
   - Capture screenshot: DevTools menu (⋮) → "Capture screenshot"
   - Save as `simulator-wide.png`
   - Navigate to Route Management tab with custom routes
   - Capture screenshot
   - Save as `route-management-wide.png`

5. **For Narrow Screenshots (Mobile)**:
   - Set device to "iPhone 12 Pro" or similar
   - Set dimensions to **750 x 1334**
   - Navigate to Simulator tab
   - Capture screenshot
   - Save as `simulator-narrow.png`

### Using Full-Page Screenshot

Alternatively, use browser extensions like:
- **Awesome Screenshot** (Chrome/Edge)
- **Nimbus Screenshot** (Chrome/Edge/Firefox)
- **Firefox Screenshot Tool** (built-in to Firefox)

## What to Show in Screenshots

### Simulator Wide Screenshot
- Active simulation running
- Route preview visible
- Stats showing (pings sent, current location)
- Professional, clean UI

### Route Management Wide Screenshot
- Custom route builder visible
- Multiple waypoints added
- Route preview showing sensor properties
- Clear demonstration of key features

### Simulator Narrow Screenshot
- Mobile-optimized view of simulator
- Key controls visible
- Good representation of mobile experience

## After Capturing Screenshots

1. Replace the placeholder files in this directory
2. Verify dimensions match manifest requirements
3. Commit and push updated screenshots:
   ```bash
   git add screenshots/*.png
   git commit -m "Update PWA screenshots with actual app captures"
   git push origin main
   ```

## Notes

- Screenshots should be high-quality PNG files
- Ensure no sensitive data is visible in screenshots
- Screenshots will appear in PWA install prompts and store listings
- Keep file sizes reasonable (optimize PNGs if needed)
