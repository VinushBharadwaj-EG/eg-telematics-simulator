# EG Telematics Simulator

> A Progressive Web App for simulating GPS and telematics data for vehicle tracking systems

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-brightgreen.svg)
![No Build](https://img.shields.io/badge/build-not%20required-success.svg)

## 🚀 Overview

EG Telematics Simulator is a powerful, browser-based tool for testing telematics backends by sending realistic GPS pings with customizable sensor data. Built as a Progressive Web App with zero build dependencies, it runs entirely in the browser and works offline.

**Perfect for:**
- Testing telematics backend systems
- Simulating vehicle routes with sensor data
- Cold chain monitoring scenarios
- Fleet management system development
- API integration testing

## ✨ Features

### 🗺️ Three Simulation Modes
- **Live GPS**: Real-time location tracking using device GPS
- **Static Location**: Fixed coordinate simulation for testing
- **Route-Based**: Simulate pre-defined or custom routes with waypoint progression

### 🎯 Explicit Sensor Override System
- **Default sensor values** configured globally (Simulator tab)
- **Per-waypoint overrides** for specific scenarios
- **Visual indicators**: Clear distinction between defaults (⚙️) and overrides (🎯)
- **8 sensor properties**: Reefer status, temperatures (3 zones), door states (2), coupling, motion
- **Dynamic controls**: "Add Override" / "Edit Override" / "Clear Override" buttons

### 🛣️ Advanced Route Management
- **Predefined European routes**: Copenhagen→Hamburg, Copenhagen→Warsaw, Bremen→Munich
- **Custom route builder**: Create routes with custom waypoints
- **GeoJSON import**: Import routes from GeoJSON files (Point/LineString/FeatureCollection)
- **Inline editing**: Edit sensor properties during active simulation
- **Waypoint insertion**: Add waypoints mid-route without rebuilding

### 📡 Realistic Telematics Payloads
- Complete Krone telematics format
- Vehicle identification (chassis, plate, asset name, VIN)
- GPS data (coordinates, speed, direction, satellites)
- EBS data (axle load, brake status)
- Sensor data (reefer, doors, coupling, motion)
- Configurable backend endpoint and authentication

### 💾 Session Persistence
- **Auto-save**: Progress saved every 5 pings
- **Per-vehicle sessions**: Independent progress for each vehicle+route combination
- **Auto-resume**: Last active session restored on page load
- **Manual reset**: Clear session to restart route from beginning

### 📱 Progressive Web App
- **Installable**: Add to home screen (Android, iOS, Desktop)
- **Offline capable**: Works without internet connection
- **Background sync**: Failed pings queued and synced when online
- **Service Worker**: Smart caching with multi-strategy approach
- **Web Worker**: Unthrottled ping intervals even in background tabs

### 🎨 User Experience
- **Tab-based interface**: Simulator, Route Management, Settings, Logs
- **Real-time logs**: Color-coded logging with timestamps
- **Live statistics**: Ping count, current location, waypoint progress
- **Responsive design**: Works on desktop, tablet, and mobile
- **No installation**: Zero dependencies, pure vanilla JavaScript

## 🖼️ Screenshots

*Coming soon - placeholder screenshots currently in use*

See [screenshots/README.md](screenshots/README.md) for screenshot generation instructions.

## 🚀 Quick Start

### Option 1: Direct File Access
```bash
# Open the HTML file directly in your browser
open telematics-simulator.html
```

### Option 2: Local Server (Recommended for PWA features)
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

Then open: `http://localhost:8000/telematics-simulator.html`

### Option 3: Deploy to GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Access via: `https://[username].github.io/[repo-name]/telematics-simulator.html`

## 📖 Usage

### 1. Configure Backend & Vehicles

**Settings Tab:**
1. Enter your telematics backend URL
2. Configure authentication token (Basic auth, base64 encoded)
3. Add vehicles with chassis, plate, asset name, and VIN

### 2. Set Default Sensor Data

**Simulator Tab:**
1. Configure default sensor values (applied to all waypoints)
2. Set reefer status, temperatures, door states, coupling, motion
3. Defaults saved to localStorage

### 3. Choose Simulation Mode

#### Live GPS Mode
- Uses device GPS for real-time location
- Requires location permission
- Actual speed from GPS data

#### Static Location Mode
- Enter fixed coordinates
- Set custom speed value
- Useful for testing specific locations

#### Route-Based Mode
1. Select vehicle from dropdown
2. Choose predefined route or custom route
3. Set ping interval (1-60 seconds)
4. Click "Start Simulation"

### 4. Build Custom Routes

**Route Management Tab:**

**Using Waypoint Builder:**
1. Enter waypoint details (name, city, lat/lon, speed, type)
2. Expand "🔧 Sensor Properties (Optional)"
3. Set sensor values (different from defaults = auto-override)
4. Click "Add Waypoint"
5. Repeat for all waypoints
6. Click "Save Custom Route"

**Using GeoJSON Import:**
1. Prepare GeoJSON (Point, LineString, or FeatureCollection)
2. Paste JSON in import field
3. Enter route name
4. Click "Import GeoJSON"
5. Route appears in dropdown

### 5. Override Sensors Per Waypoint

**In Route Preview:**
1. Select route with waypoints
2. Click "➕ Add Override" (no override) or "✏️ Edit Override" (has override)
3. Inline form appears with sensor properties
4. Modify values, click "✓ Apply Changes"
5. Click "💾 Save Route Changes"
6. Click "✕ Clear Override" to revert to defaults

### 6. Monitor Simulation

**Logs Tab:**
- Real-time color-coded logs
- Success (green), errors (red), info (blue)
- Payload preview on success
- Failed pings queued for retry

**Statistics:**
- Pings sent counter
- Current waypoint progress (X/Total)
- Current location display
- GPS coordinates and speed

## 🏗️ Architecture

### Technology Stack
- **Pure Frontend**: Vanilla HTML/CSS/JavaScript
- **No Build Process**: Zero dependencies, no npm/webpack
- **Progressive Web App**: Service Worker + Web Worker
- **Storage**: localStorage for data persistence

### Key Components

#### 1. State Management
Global `state` object tracking:
- Simulation status, mode, location
- Route progress, ping count
- Vehicles, routes, sessions
- Default sensor data

#### 2. Web Worker (Background Pings)
- Inline worker prevents browser throttling
- Accurate ping intervals in background tabs
- START/STOP message handling

#### 3. Service Worker (PWA)
- **App shell caching**: HTML, manifest, icons
- **Network-first for HTML**: Always get latest version
- **Cache-first for icons**: Instant load
- **Stale-while-revalidate**: Balance speed and freshness

#### 4. Offline Support
- Failed pings queued to localStorage
- Automatic sync when connection restored
- Background Sync API (Android Chrome)
- Queue persistence across app restarts

#### 5. Session Persistence
- Per-vehicle+route session tracking
- Auto-save every 5 pings
- Last session auto-restore
- Manual reset capability

### File Structure
```
eg-telematics-simulator/
├── telematics-simulator.html   # Main application (single file)
├── manifest.json                # PWA configuration
├── service-worker.js            # Service Worker (~160 lines)
├── icons/                       # PWA icons (96-512px)
│   ├── eg-logo.svg
│   ├── icon-*.png
│   └── README.md
├── screenshots/                 # PWA screenshots
│   ├── simulator-wide.png
│   ├── route-management-wide.png
│   ├── simulator-narrow.png
│   └── README.md
├── CLAUDE.md                    # Development guide for Claude Code
├── PWA-IMPLEMENTATION.md        # PWA feature documentation
└── README.md                    # This file
```

## 🛠️ Development

### Prerequisites
- Modern web browser (Chrome, Edge, Firefox, Safari)
- Text editor or IDE
- Local web server (for PWA testing)

### Making Changes

1. **Edit HTML file directly** - All code in one file
2. **No build step required** - Refresh browser to see changes
3. **Test PWA features** - Requires HTTPS or localhost

### PWA Development

**Service Worker Updates:**
1. Update `CACHE_VERSION` in [service-worker.js](service-worker.js#L1)
2. Modify caching strategies as needed
3. Test update flow in DevTools > Application > Service Workers

**Install Prompt Customization:**
- Edit install banner HTML (lines ~347-361)
- Modify dismissal period (default: 7 days)

**Offline Queue Behavior:**
- Retry limit: 3 attempts (modify at line ~1369)
- Queue size limit: unlimited (add check if needed)

### Browser DevTools Tips

- **Application tab**: Inspect Service Worker, cache, localStorage
- **Network tab**: Monitor ping requests, check payload
- **Console**: View real-time logs (color-coded)
- **Device toolbar**: Test mobile views (Ctrl+Shift+M)

## 🌐 Deployment

### GitHub Pages (Recommended)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/[username]/[repo].git
git push -u origin main
```

Enable GitHub Pages in repository Settings > Pages > Source: main branch

### Other Platforms
- **Netlify**: Drag & drop folder
- **Vercel**: Connect GitHub repo
- **Firebase Hosting**: `firebase deploy`
- **Any static host**: Upload files via FTP

## 📊 Testing Checklist

### Core Functionality
- [ ] Live GPS mode with real location
- [ ] Static location with fixed coordinates
- [ ] Route-based with waypoint progression
- [ ] Backend ping success (check Network tab)
- [ ] Session persistence (reload page)

### Sensor Override System
- [ ] Default values configured in Simulator tab
- [ ] Waypoint shows "⚙️ Using Defaults" badge
- [ ] Add Override button creates override
- [ ] Waypoint shows "🎯 Override" badge
- [ ] Edit Override modifies values
- [ ] Clear Override reverts to defaults
- [ ] Predefined routes use defaults

### Route Management
- [ ] Custom route creation with waypoint builder
- [ ] GeoJSON import (Point, LineString, FeatureCollection)
- [ ] Inline sensor editing in route preview
- [ ] Waypoint insertion mid-route
- [ ] Save route to localStorage
- [ ] Delete custom routes

### PWA Features
- [ ] Install prompt appears
- [ ] App installs to home screen
- [ ] Offline mode works (Network tab > Offline)
- [ ] Failed pings queued
- [ ] Pings sync when back online
- [ ] Service Worker updates detected

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- **UI/UX enhancements**: Better mobile layout, dark mode
- **Additional route formats**: KML, GPX import
- **Real screenshots**: Replace placeholder PWA screenshots
- **Sensor properties**: Add more telematics fields
- **Export functionality**: Download routes as GeoJSON
- **Payload templates**: Support multiple backend formats
- **Statistics dashboard**: Charts, graphs, analytics

### Development Workflow
1. Fork repository
2. Create feature branch
3. Make changes (test thoroughly)
4. Submit pull request with description

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

- Built for EG telematics system testing
- Krone telematics payload format
- Progressive Web App best practices
- European route data

## 📞 Support

For issues, questions, or feature requests:
- Open GitHub issue
- Check [CLAUDE.md](CLAUDE.md) for development guide
- Review [PWA-IMPLEMENTATION.md](PWA-IMPLEMENTATION.md) for PWA details

---

**Made with ❤️ using vanilla JavaScript**
