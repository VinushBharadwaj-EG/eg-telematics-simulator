# Icon Generation Instructions

## Quick Method (Recommended)

Use an online PWA icon generator:

1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload `eg-logo.svg` from this directory
3. Download the generated icons
4. Extract and save these files in this directory:
   - `icon-96x96.png`
   - `icon-192x192.png`
   - `icon-512x512.png`
   - `icon-180x180.png`
   - `maskable-icon-512x512.png`

## Alternative: RealFaviconGenerator

1. Go to https://realfavicongenerator.net/
2. Upload `eg-logo.svg`
3. Configure PWA settings
4. Download and extract icons to this directory

## Manual Method (Inkscape/GIMP)

If you have Inkscape or GIMP installed:

1. Open `eg-logo.svg`
2. Export as PNG with these sizes:
   - 96x96, 192x192, 512x512, 180x180
3. For maskable icon: Add safe area padding (10% minimum on all sides) to 512x512

## Required Files

- ✅ `eg-logo.svg` - Source file (already created)
- ⬜ `icon-96x96.png` - Android minimal
- ⬜ `icon-192x192.png` - Android standard (REQUIRED)
- ⬜ `icon-512x512.png` - Android high-res (REQUIRED)
- ⬜ `icon-180x180.png` - iOS home screen
- ⬜ `maskable-icon-512x512.png` - Android adaptive icon

## Next Steps

Once icons are generated:
1. Verify all 5 PNG files are in this directory
2. The implementation will automatically reference them from manifest.json
3. Test in Chrome DevTools > Application > Manifest
