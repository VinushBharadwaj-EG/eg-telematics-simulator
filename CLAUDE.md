# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EG Telematics Simulator is a Progressive Web App (PWA) for simulating GPS and telematics data for vehicle tracking systems. It allows testing of telematics backends by sending realistic GPS pings with three simulation modes: Live GPS, Static Location, and Route-Based simulation.

## Technology Stack

- **Pure Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build process)
- **PWA**: Service Worker for offline capability and caching
- **Web Worker**: Inline Web Worker for unthrottled background ping execution
- **Storage**: localStorage for persistent data (vehicles, routes, sessions, settings)

## File Structure

- `telematics-simulator.html` - Main application (single-page app containing all UI, styles, and logic)
- `manifest.json` - PWA configuration (icons, display modes, shortcuts, theme colors)
- `service-worker.js` - PWA caching, offline support, and background sync (~160 lines)
- `icons/` - PWA icon assets directory
  - `eg-logo.svg` - Source logo for icon generation
  - `icon-*.png` - PNG icons in multiple sizes (96, 192, 512, 180, maskable-512)
  - `README.md` - Icon generation instructions
- `PWA-IMPLEMENTATION.md` - Complete PWA implementation documentation

## Development Workflow

Since this is a pure frontend application with no build process:

1. **Run locally**: Open `telematics-simulator.html` in a browser, or serve via HTTP server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```

2. **Test PWA features**: Use HTTPS (required for Service Worker) or localhost

3. **Debug**: Use browser DevTools console for logs and errors

## Architecture and Key Concepts

### State Management

The application uses a global `state` object that tracks:
- Current simulation status (`isRunning`, `intervalId`)
- Simulation mode (`live`, `static`, `route`)
- Current location data (`currentLat`, `currentLon`, `currentSpeed`)
- Route progress (`currentWaypointIdx`, `pingCount`)
- User data (`vehicles`, `routes`, `backendUrl`, `bearerToken`)
- Session persistence (`sessions`)

**Additional PWA State Variables**:
- `isOnline` - Network connection status (boolean, tracks navigator.onLine)
- `failedPingsQueue` - Array of queued failed pings, loaded from localStorage
- `deferredInstallPrompt` - Stored beforeinstallprompt event for triggering PWA install
- `isAppInstalled` - Boolean tracking if app is installed (checks display-mode: standalone)
- `pingWorker` - Active Web Worker instance for background ping execution

### Session Persistence

The simulator implements **session persistence per vehicle+route combination**:
- Each vehicle+route pair has its own session state
- Sessions store: waypoint index, ping count, last updated time
- Sessions auto-save every 5 pings and on simulation stop
- Last active session auto-restores on page load
- Key format: `{vehicleId}_{routeKey}`

Functions:
- `saveSession(vehicleIdx, routeKey)` - Saves current progress
- `loadSession(vehicleIdx, routeKey)` - Restores saved progress
- `clearSession(vehicleIdx, routeKey)` - Deletes session (used by Reset Route button)
- `restoreLastSession()` - Auto-restores most recent session on load

### Web Worker for Background Execution

The application uses an **inline Web Worker** to prevent browser throttling of ping intervals when the tab is in the background:

**Implementation** (lines 575-594):
- Web Worker code is defined as a string and converted to a blob URL
- Worker handles START/STOP messages with interval management
- Posts PING messages back to main thread at precise intervals

**Key variables**:
- `workerCode` - String containing the Web Worker JavaScript code
- `workerUrl` - Blob URL created from worker code
- `pingWorker` - Active Web Worker instance (null when stopped)

**Lifecycle**:
1. `startSimulation()` creates a new Worker from `workerUrl`
2. Sends START message with interval to worker
3. Worker posts PING messages at exact intervals (unthrottled)
4. Main thread receives messages and calls `sendPing()`
5. `stopSimulation()` sends STOP message and terminates worker

**Tab Visibility Monitoring** (lines 732-739):
- Listens to `visibilitychange` events
- Logs informational messages when tab goes to background/foreground
- Web Worker ensures pings continue at set interval regardless of tab state

**Why Web Workers?**
Browsers throttle `setInterval` calls in background tabs (typically to 1 second minimum). Web Workers run in separate threads and are not throttled, ensuring accurate ping intervals even when the simulator tab is not active.

### PWA Installation System

The application implements a custom PWA installation experience:

**Components** (lines 347-366, 596-684):
- Custom install prompt banner (gradient background, 2 action buttons)
- Installation success banner (auto-hides after 5 seconds)
- beforeinstallprompt event capture and deferral
- 7-day dismissal period tracking via localStorage

**Key Variables**:
- `deferredInstallPrompt` - Stores beforeinstallprompt event
- `isAppInstalled` - Tracks installation status (checks display-mode: standalone or navigator.standalone)

**Functions**:
- `installPWA()` - Triggers browser install prompt, handles user choice
- `dismissInstallPrompt()` - Hides banner for 7 days, stores dismissal timestamp

**Event Handlers**:
- `beforeinstallprompt` - Captures install event, shows custom banner (only if not installed and not recently dismissed)
- `appinstalled` - Detects successful installation, updates UI state, shows success banner

**Platform Support**:
- Android Chrome/Edge: Full A2HS (Add to Home Screen) support
- iOS Safari: Add to Home Screen via Share button
- Windows/macOS: Desktop PWA installation
- Cross-platform meta tags for optimal display (lines 15-26)

### Offline Support & Background Sync

The application implements comprehensive offline support with automatic queue and sync:

**Offline Detection** (lines 597-617):
- Monitors `online` and `offline` events
- Shows/hides offline indicator banner
- Initializes from navigator.onLine on load
- Automatically triggers sync when connection restored

**Failed Ping Queue System**:

**Queue Structure**:
Each queued ping contains:
- `id` - Unique UUID for tracking
- `payload` - Complete ping payload (JSON)
- `location` - Waypoint/location name for logging
- `timestamp` - Queue time (milliseconds)
- `retryCount` - Number of sync attempts (max 3)

**Functions**:
- `queueFailedPing(payload, location)` - Adds failed ping to queue, saves to localStorage, registers background sync
- `syncFailedPings()` - Async function that replays all queued pings, tracks successes, removes after 3 failures

**Modified sendPing Behavior** (lines 1289-1318):
- Only increments `pingCount` on successful response (res.ok)
- Calls `queueFailedPing()` on HTTP error status codes (4xx, 5xx)
- Calls `queueFailedPing()` on network errors (offline, timeout, DNS failure)
- Shows waypoint progress in logs: "Ping #5: Copenhagen Port (Waypoint 1/8)"

**Background Sync API Integration**:
- Registers 'sync-pings' event when ping queued (Android Chrome support)
- Service worker receives sync event, posts message to main thread
- Main thread calls `syncFailedPings()` to replay queue
- Fallback to online event for browsers without Background Sync API

**Persistence**:
- Queue survives page reloads and app restarts
- Load event notifies user: "📦 5 pings queued from previous session"
- Automatic sync attempt when app reopens online

### Enhanced Service Worker

Complete rewrite implementing multi-strategy caching and background sync support.

**Cache Versioning** (service-worker.js:1-3):
- `CACHE_VERSION` - Current version (v1.2.0)
- `CACHE_NAME` - App shell cache with version
- `RUNTIME_CACHE` - Dynamic content cache with version

**Precached Resources**:
- telematics-simulator.html (main app)
- manifest.json (PWA config)
- icon-192x192.png (Android standard)
- icon-512x512.png (high-res)

**Caching Strategies by Resource Type**:

1. **Network-First for HTML** (lines 70-87):
   - Fetch fresh HTML from network
   - Update cache on successful fetch
   - Fallback to cache when offline
   - Ensures users get latest app updates

2. **Cache-First for Icons** (lines 89-109):
   - Serve from cache if available (instant load)
   - Fetch and cache on cache miss
   - Icons rarely change, prioritize speed

3. **Stale-While-Revalidate for Others** (lines 111-127):
   - Return cached version immediately
   - Fetch fresh version in background
   - Update cache for next request
   - Best balance of speed and freshness

**Lifecycle Management**:
- **Install**: Precache app shell, skip waiting for immediate activation
- **Activate**: Delete old cache versions, claim clients immediately
- **Fetch**: Route requests to appropriate caching strategy based on resource type

**Background Sync Handler** (lines 129-146):
- Listens for 'sync-pings' event
- Posts SYNC_PINGS message to all clients
- Triggers syncFailedPings() in main thread

**Message Handler** (lines 148-160):
- SKIP_WAITING: Force new service worker activation (for updates)
- CACHE_URLS: Dynamically add URLs to runtime cache

**Service Worker Update System** (HTML lines 1490-1552):
- Hourly automatic update checks
- Update detection via updatefound event
- User notification banner: "🎉 New version available!"
- One-click update with automatic reload
- Update/Later buttons for user control

### Simulation Modes

1. **Live GPS**: Uses browser Geolocation API to get real device location
2. **Static Location**: Sends fixed coordinates repeatedly
3. **Route-Based**: Iterates through waypoints, advancing after each ping

### Route System

**Predefined Routes**:
- Hardcoded European routes (Copenhagen→Hamburg, Copenhagen→Warsaw, Bremen→Munich)
- Stored in `predefinedRoutes` constant

**Custom Routes**:
- Built using waypoint builder (name, city, lat/lon, speed, type)
- Stored in localStorage as `customRoutes`
- Merged with predefined routes in route selector

**GeoJSON Import**:
- Supports multiple formats:
  - Array of `{latitude, longitude}` objects
  - GeoJSON FeatureCollection with Point geometries
  - GeoJSON LineString (direct or wrapped in Feature)
- Automatically converts to internal waypoint format
- FeatureCollection format supports sensor properties (see below)

### Waypoint Sensor Properties

**Overview**:
Each waypoint in Route-Based simulation can have configurable sensor properties that simulate realistic vehicle states (refrigeration, door status, temperatures, coupling). These properties are sent in the telematics payload for each waypoint, enabling testing of sensor-based scenarios.

**Configurable Properties** (7 total):

| Property | Type | Range/Values | Default | Payload Field |
|----------|------|--------------|---------|---------------|
| `reeferOn` | boolean | true/false | false | `boxdata.reefer.BD_REEFER_ON` |
| `temp1` | number | -30 to 30°C (0.5° steps) | 20 | `boxdata.reefer.BD_TEMP1` |
| `temp2` | number | -30 to 30°C (0.5° steps) | 20 | `boxdata.reefer.BD_TEMP2` |
| `temp3` | number | -30 to 30°C (0.5° steps) | 20 | `boxdata.reefer.BD_TEMP3` |
| `doorOpen` | boolean | true/false | false | `boxdata.door.BD_DOOR_OPEN` |
| `doorOpen2` | boolean | true/false | false | `boxdata.door.BD_DOOR_OPEN_2` |
| `coupled` | boolean | true/false | true | `boxdata.BD_COUPLED` |

**UI Implementation** (lines 514-561):
- Collapsible `<details>` section in waypoint builder: "🔧 Sensor Properties (Optional)"
- Grouped by category: Refrigeration, Doors, Coupling
- Checkboxes for boolean values (reefer on/off, doors open/closed, coupled/uncoupled)
- Number inputs for temperatures with min/max/step validation
- Form resets to defaults after adding waypoint

**Waypoint Data Structure**:
```javascript
{
    name: string,
    city: string,
    country: string,
    lat: number,
    lon: number,
    speed: number,
    type: string,
    // Optional sensor properties (backward compatible)
    reeferOn?: boolean,
    temp1?: number,
    temp2?: number,
    temp3?: number,
    doorOpen?: boolean,
    doorOpen2?: boolean,
    coupled?: boolean
}
```

**Display Features**:
- **Waypoint List** (lines 1106-1131): Shows sensor badges with emoji indicators (❄️ reefer, 🚪 doors, 🌡️ temps, ⚠️ uncoupled)
- **Route Preview** (lines 1453-1479): Displays sensor status per waypoint with temperature ranges
- **Smart Display**: Only shows non-default values to keep UI clean
- **Compact Format**: "❄️ -10°/10°/-2°C • 🚪 Door1+Door2 • ⚠️ Uncoupled"

**Payload Integration** (sendPing lines 1518-1541):
- Extracts sensor properties from current waypoint in route mode
- Falls back to sensible defaults if properties undefined (backward compatible)
- Live/Static modes use default sensor values
- All 7 properties dynamically populate the payload:
  ```javascript
  sensorData = {
      reeferOn: wp.reeferOn !== undefined ? wp.reeferOn : false,
      temp1: wp.temp1 !== undefined ? wp.temp1 : 20,
      // ... (fallback pattern for all 7 properties)
  };
  ```

**Predefined Route Scenarios** (lines 821-928):

1. **Copenhagen → Hamburg** (Cold Chain):
   - Copenhagen Port: Loading (18°C, doors open, reefer starting)
   - Roskilde: En route (5°C, doors closed, cooling)
   - Kolding: Optimal temps reached (2°C)
   - Flensburg: Border crossing (3°C, one door open for inspection)
   - Kiel/Lübeck: Stable transport (2°C)
   - Hamburg Port: Unloading (4°C, doors open)

2. **Copenhagen → Warsaw** (Non-Refrigerated):
   - All waypoints: Ambient temperature (20°C), reefer off
   - Copenhagen: Loading (both doors open)
   - Stockholm: Rest stop (one door open for inspection)
   - Warsaw: Unloading (both doors open)

3. **Bremen → Munich** (Multi-Zone Refrigeration):
   - Different temperature zones throughout route
   - Bremen Port: Loading (-5°/15°/2°C, doors open)
   - Hannover: Cooling (-8°/12°/0°C)
   - Frankfurt/Nürnberg: Optimal (-10°/10°/-2°C)
   - Munich: Unloading (-7°/12°/0°C, doors open)

**GeoJSON Import Support** (lines 1316-1331):
- FeatureCollection format supports sensor properties in `properties` field
- Accepts both camelCase (`reeferOn`, `doorOpen`) and snake_case (`BD_REEFER_ON`, `BD_DOOR_OPEN`)
- Falls back to defaults if properties not specified
- Example GeoJSON:
  ```json
  {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "properties": {
        "name": "Port A",
        "reeferOn": true,
        "temp1": -5,
        "doorOpen": true,
        "coupled": true
      },
      "geometry": {
        "type": "Point",
        "coordinates": [12.5681, 55.6761]
      }
    }]
  }
  ```

**Backward Compatibility**:
- Sensor properties are optional in waypoint objects
- Existing routes without sensor properties work with defaults
- No migration required for old saved routes
- Custom routes created before this feature automatically use defaults

**Use Cases**:
- Cold chain monitoring simulation (temperature fluctuations)
- Port operations testing (doors open at loading/unloading)
- Border crossing scenarios (inspection with door open)
- Multi-zone refrigerated cargo (different temps per zone)
- Coupling status monitoring (trailer detachment events)
- Backend testing with realistic sensor data patterns

### Route Preview Inline Editing

**Overview**:
The Route Preview section supports inline editing of sensor properties and insertion of new waypoints, enabling route customization and deviation simulation without rebuilding routes from scratch. Edits can be made during active simulations with automatic pause/resume behavior.

**Edit Mode State Management** (lines 795-801):
```javascript
state = {
    editingRoute: null,          // Route key being edited (null = not editing)
    editingWaypointIdx: null,    // Waypoint index being edited (null = not editing)
    pendingRouteChanges: null,   // Deep copy of route for uncommitted changes
    isEditMode: false,           // Boolean flag for UI state
    wasPausedForEdit: false,     // Track if simulation was paused for editing
    insertingAfterIdx: null      // Track which waypoint has inline insert form open
};
```

**Key Features**:

1. **Inline Sensor Editing** (lines 1528-1628):
   - Click "✏️ Edit Sensors" on any waypoint in route preview
   - Inline form expands with current sensor values pre-filled
   - Edit all 7 sensor properties (reefer, temps, doors, coupling)
   - Per-waypoint "Apply Changes" button
   - Visual highlight of currently editing waypoint (background color)

2. **Waypoint Insertion** (lines 1787-1858):
   - Click "➕ Insert Below" to add waypoint between existing ones
   - Inline form with required fields: name, city, lat, lon
   - User-defined coordinates (not auto-calculated)
   - Full validation: lat (-90 to 90), lon (-180 to 180)
   - Optional sensor properties (collapsible section)
   - Inserted waypoints inherit country from reference waypoint

3. **Copy-on-Write for Predefined Routes** (lines 1670-1726):
   - Predefined routes are immutable (hardcoded)
   - Editing a predefined route creates custom copy: "Route Name (Custom Copy)"
   - Route dropdown automatically switches to new custom copy
   - Original predefined route remains unchanged
   - Copy persists to localStorage as custom route

4. **Active Simulation Editing** (lines 1866-1898):
   - **Pause behavior**: Simulation pauses when editing future waypoints (retains `currentWaypointIdx`)
   - **Edit restrictions**: Cannot edit current or past waypoints during simulation (index <= currentWaypointIdx)
   - **Immediate application**: Changes apply to `state.currentRoute` immediately when saved
   - **Resume behavior**: Simulation resumes automatically after save/cancel
   - **Conditional UI**: Past waypoints show "✓ Already simulated", current shows "⏩ Currently sending...", future show edit buttons

5. **Explicit Save/Discard Controls**:
   - Global "💾 Save Route Changes" button at bottom of preview
   - "✕ Discard All Changes" with confirmation dialog
   - Changes commit to localStorage and update `state.currentRoute`
   - Uncommitted edits stored in `pendingRouteChanges` (in-memory only)

**Functions**:

| Function | Purpose | Location |
|----------|---------|----------|
| `editWaypoint(idx)` | Enter edit mode for specific waypoint, pause simulation if running | lines 1642-1668 |
| `enableEditMode(routeKey)` | Initialize edit mode, handle predefined route copying | lines 1670-1726 |
| `applyWaypointEdit(idx)` | Apply sensor changes to single waypoint, update badges | lines 1728-1758 |
| `cancelWaypointEdit()` | Cancel single waypoint edit, close form | lines 1760-1774 |
| `saveRouteChanges()` | Commit all changes to localStorage, resume simulation | lines 1728-1758 |
| `cancelRouteEditing()` | Discard all pending changes, resume simulation | lines 1760-1774 |
| `insertWaypointAfter(idx)` | Show inline insert form after specific waypoint | lines 1776-1785 |
| `addInsertedWaypoint(afterIdx)` | Process insert form submission with validation | lines 1787-1858 |
| `cancelInsertWaypoint()` | Cancel insert form, close form | lines 1860-1864 |
| `pauseSimulationForEdit()` | Pause Web Worker, set `wasPausedForEdit` flag | lines 1866-1879 |
| `resumeSimulationAfterEdit()` | Resume Web Worker if `wasPausedForEdit` is true | lines 1881-1898 |

**UI Components**:

1. **Edit Form** (per waypoint, conditionally rendered):
   - Reefer checkbox + 3 temperature inputs (grid layout)
   - Door 1 and Door 2 checkboxes
   - Coupling checkbox
   - "✓ Apply Changes" and "✕ Cancel" buttons

2. **Insert Form** (conditionally rendered after waypoint):
   - Name (text, required)
   - City (text, required)
   - Latitude (number, -90 to 90, step 0.000001, required)
   - Longitude (number, -180 to 180, step 0.000001, required)
   - Speed (number, default 30)
   - Type (select: Waypoint/Stop/Port/Border)
   - Sensor properties (collapsible `<details>`, optional)
   - "✓ Add Waypoint" and "✕ Cancel" buttons

3. **Action Buttons** (conditional based on simulation state):
   - **Past waypoints** (i < currentWaypointIdx): "✓ Already simulated" (disabled)
   - **Current waypoint** (i === currentWaypointIdx): "⏩ Currently sending..." (disabled)
   - **Future waypoints** (i > currentWaypointIdx or not running): "✏️ Edit Sensors" + "➕ Insert Below"
   - **Paused indicator**: "(paused)" warning when `wasPausedForEdit` is true

4. **Global Controls** (bottom of preview, shown when `isEditMode` is true):
   - "💾 Save Route Changes" (green, commits to localStorage)
   - "✕ Discard All Changes" (gray, confirmation dialog)

**User Flows**:

1. **Edit Custom Route**:
   - Select custom route → Click "Edit Sensors" on waypoint → Modify values → Click "Apply Changes" → Click "Save Route Changes"

2. **Edit Predefined Route**:
   - Select predefined route → Click "Edit Sensors" → System creates "(Custom Copy)" → Dropdown switches to copy → Edit → Save

3. **Insert Waypoint**:
   - Select route → Click "Insert Below" on waypoint 2 → Fill in name, city, lat, lon → Optionally set sensors → Click "Add Waypoint" → Click "Save Route Changes"

4. **Edit During Simulation**:
   - Start simulation → Navigate to waypoint 3 → Try to edit waypoint 1 → Error: "Cannot edit current or already-simulated waypoints" → Edit waypoint 5 → Simulation pauses → Apply changes → Save → Simulation resumes at waypoint 3

5. **Discard Changes**:
   - Edit 3 waypoints → Realize mistake → Click "Discard All Changes" → Confirm dialog → All edits reverted

**Validation & Error Handling**:

- **Latitude validation**: Must be between -90 and 90
- **Longitude validation**: Must be between -180 and 180
- **Required fields**: Name, city, lat, lon for waypoint insertion
- **Temperature clamping**: Input validates -30°C to 30°C range
- **Concurrent route selection**: Prompts to save/discard if switching routes while in edit mode
- **Page reload warning**: Optional beforeunload event if `isEditMode` is true (prevents accidental data loss)

**Backward Compatibility**:
- Existing routes without inline editing continue to work
- `pendingRouteChanges` is in-memory only (not persisted)
- No migration required for old routes
- Read-only by default (edit mode is opt-in)

**Integration with startSimulation()**:
- Line 1939: `state.currentRoute = state.routes[routeKey] || predefinedRoutes[routeKey];`
- Always reloads route from storage to pick up saved edits
- Ensures new simulations use latest sensor values

**Use Cases**:
- **Route deviation testing**: Insert waypoints mid-route to simulate detours
- **Sensor scenario refinement**: Adjust temperatures/door states after route creation
- **Real-time route modification**: Edit future waypoints during active simulation
- **Predefined route customization**: Create custom variants of standard routes
- **Batch editing**: Edit multiple waypoints, then save all changes at once

### Backend Communication

Sends HTTP POST requests to configured backend:
- Endpoint: Configured in Settings tab
- Authentication: Basic token (base64 encoded)
- Payload: Complex JSON structure matching Krone telematics format
- Key fields: vehicle data, GPS coordinates, speed, EBS data, reefer data

Payload structure includes:
- API metadata (version, id, timestamps)
- Vehicle identification (chassis, plate, asset name, vehicle ID)
- GPS data (latitude, longitude, speed, direction, satellites)
- Sensor data (EBS axle load, door status, reefer temperature, battery)

### Data Persistence

Uses localStorage for:
- `vehicles` - Array of vehicle objects
- `customRoutes` - User-created routes
- `simulationSessions` - Session state per vehicle+route (waypoint index, ping count, timestamp)
- `backendUrl` - API endpoint
- `bearerToken` - Authentication token
- `failedPingsQueue` - JSON array of queued ping payloads (for offline support)
- `installPromptDismissed` - Timestamp of last PWA install prompt dismissal (7-day expiry)

## Common Modifications

### Adding a New Simulation Mode

1. Add option to `#simMode` select in HTML
2. Add UI section for mode (like `staticModeUI` or `routeModeUI`)
3. Update `changeModeUI()` to show/hide your UI
4. Implement location logic in `sendPing()` function
5. Update mode label in `startSimulation()`

### Adding New Waypoint Properties

**Reference Implementation**: See "Waypoint Sensor Properties" feature (lines 514-561, 1022-1093, 1106-1131, 1316-1331, 1518-1541)

1. **Add UI inputs** to waypoint builder section (collapsible `<details>` recommended for optional properties)
2. **Update `addWaypoint()`** to capture new fields from form inputs
3. **Add to waypoint object** with optional properties (use `?:` for backward compatibility)
4. **Modify `renderCustomWaypoints()`** to display badges/indicators for non-default values
5. **Update `sendPing()`** to extract properties from waypoint with fallback defaults
6. **Update `importGeoJSON()`** to map GeoJSON properties to waypoint fields (support both naming conventions)
7. **Update `updateRoutePreview()`** to show properties in route preview
8. **Test thoroughly**: Form inputs, display, payload, GeoJSON import, backward compatibility

### Adding New Vehicle Fields

1. Add input field in "Manage Vehicles" section
2. Update `addVehicle()` to capture the field
3. Modify `renderVehiclesList()` to display it
4. Update `sendPing()` payload to include it

### Modifying Backend Payload

Edit the `payload` object construction in `sendPing()` function (around line 1227 onwards). The payload structure must match your backend's expected format.

### Modifying Web Worker Behavior

The Web Worker code is inlined as a string (lines 576-590). To modify:
1. Edit the `workerCode` string
2. Keep the message event listener structure
3. Ensure START/STOP message types are handled
4. Post PING messages at the correct interval
5. Test thoroughly - worker errors are harder to debug

### Service Worker Updates

When modifying cached files:
1. Update `CACHE_VERSION` in [service-worker.js](service-worker.js#L1) (e.g., v1.2.0 → v1.3.0)
2. Update `PRECACHE_URLS` array if adding new files to app shell
3. Deploy updated files to server
4. Service worker will auto-detect update within 1 hour
5. User will see update notification banner
6. Old cache automatically deleted on activation

### Modifying PWA Features

**Install Prompt Customization**:
- Edit install prompt HTML (lines 347-361) for custom messaging
- Modify dismissal period: Change 7-day calculation in lines 609-614
- Customize success banner (lines 363-366)

**Offline Queue Behavior**:
- Modify retry limit: Change `item.retryCount >= 3` in line 1369
- Add queue size limit: Check `failedPingsQueue.length` before queueing
- Change sync strategy: Modify `syncFailedPings()` function (lines 1345-1386)

**Background Sync**:
- Service worker sync event: [service-worker.js](service-worker.js#L129-146)
- Registration: [telematics-simulator.html](telematics-simulator.html#L1335-1342)
- Fallback to online event for non-supporting browsers

## UI Structure

The application uses a tab-based interface:

1. **Simulator Tab**: Active simulation controls and stats
2. **Route Management Tab**: Route builder, predefined routes, GeoJSON import
3. **Settings Tab**: Backend configuration, vehicle management
4. **Logs Tab**: Real-time transmission logs

## Color Scheme

The application uses a custom design system with CSS variables defined in `:root`:
- Primary color: Teal (`#21808d`)
- Background: Cream tones (`#fcfcf9`, `#ffffd`)
- Text: Slate/charcoal tones
- Accent: Red for errors/danger actions

When adding UI elements, use existing CSS classes (`.btn`, `.form-control`, `.card`, etc.) and CSS variables for consistency.

## Validation Pattern

The application implements visual validation:
- Sets `borderColor` to `var(--color-error)` on invalid fields
- Focuses first invalid field
- Logs error message
- Clears validation state before revalidating

When adding validation, follow this pattern (see `addWaypoint()`, `saveCustomRoute()`, etc.).

## Testing Considerations

### Core Functionality Testing

When testing changes:
1. Clear localStorage to test fresh state: `localStorage.clear()`
2. Unregister service worker in DevTools to test without cache
3. Test all three simulation modes (Live GPS, Static, Route)
4. Test session persistence (start, stop, reload page)
5. Test with multiple vehicles and routes
6. Verify backend payload structure matches expected format

### Sensor Properties Testing

**Waypoint Builder**:
1. Navigate to Route Management tab
2. Expand "🔧 Sensor Properties (Optional)" section
3. Set various sensor values (reefer on, temps, doors open, coupled status)
4. Add waypoint - verify sensor badges appear in waypoint list
5. Verify sensor fields reset to defaults after adding
6. Check temperature validation (min: -30°C, max: 30°C, step: 0.5°C)

**Predefined Routes**:
1. Select "Copenhagen → Hamburg" route
2. Verify route preview shows sensor icons (❄️, 🚪, 🌡️)
3. Check Copenhagen Port shows: "❄️ 18°/18°/18°C • 🚪 Door1+Door2"
4. Check Hamburg Port shows doors open
5. Verify Flensburg shows one door open (border inspection)

**Simulation & Payload**:
1. Select a predefined route with sensor data
2. Start simulation, capture network request (DevTools > Network)
3. Inspect payload JSON for waypoint 1:
   - Verify `boxdata.BD_COUPLED` matches waypoint's `coupled` value
   - Verify `boxdata.reefer.BD_REEFER_ON` matches `reeferOn`
   - Verify `boxdata.reefer.BD_TEMP1/2/3` match temperature values
   - Verify `boxdata.door.BD_DOOR_OPEN` and `BD_DOOR_OPEN_2` match door states
4. Let simulation advance to waypoint 2, capture request again
5. Verify sensor values changed according to waypoint 2's properties

**GeoJSON Import**:
1. Create test GeoJSON with sensor properties:
   ```json
   {
     "type": "FeatureCollection",
     "features": [{
       "type": "Feature",
       "properties": {
         "name": "Test Port",
         "reeferOn": true,
         "temp1": -10,
         "doorOpen": true
       },
       "geometry": {"type": "Point", "coordinates": [12.5, 55.6]}
     }]
   }
   ```
2. Import via Route Management tab
3. Verify waypoint shows sensor badges
4. Start simulation, verify payload contains sensor values

**Backward Compatibility**:
1. Create route without sensor properties (old waypoint format)
2. Start simulation
3. Verify defaults used: reefer off, doors closed, 20°C, coupled
4. Check payload: `BD_REEFER_ON: false`, `BD_TEMP1: 20`, etc.
5. No errors should occur with undefined sensor properties

**Display Testing**:
1. Create waypoint with all default values (reefer off, 20°C, doors closed)
2. Verify NO sensor badges appear (only show non-defaults)
3. Create waypoint with reefer on at -10°C
4. Verify badge shows: "❄️ -10°/-10°/-10°C"
5. Create waypoint with both doors open
6. Verify badge shows: "🚪 Door1+Door2"

### Route Preview Inline Editing Testing

**Edit Mode Basic Testing**:
1. Select a custom route from dropdown
2. Click "✏️ Edit Sensors" on waypoint 3
3. Verify inline form expands with current sensor values pre-filled
4. Change temp1 from 20°C to -10°C
5. Check "Reefer On" checkbox
6. Click "✓ Apply Changes"
7. Verify form collapses and sensor badge updates: "❄️ -10°/20°/20°C"
8. Click "💾 Save Route Changes" at bottom
9. Verify log message: "✓ Route changes saved"
10. Reload page - verify edits persisted in route preview

**Predefined Route Copy-on-Write Testing**:
1. Select "Copenhagen → Hamburg" (predefined route)
2. Click "✏️ Edit Sensors" on Copenhagen Port waypoint
3. Verify log message: "📋 Copied predefined route to custom routes for editing"
4. Verify route dropdown switches to "Copenhagen → Hamburg (Custom Copy)"
5. Edit sensor properties (e.g., change temp1 to 15°C)
6. Click "✓ Apply Changes", then "💾 Save Route Changes"
7. Select original "Copenhagen → Hamburg" predefined route from dropdown
8. Verify original route unchanged (Copenhagen Port still shows 18°C)
9. Select custom copy from dropdown
10. Verify custom copy has edited values (Copenhagen Port shows 15°C)
11. Check localStorage: `localStorage.getItem('customRoutes')` should contain custom copy

**Waypoint Insertion Testing**:
1. Select route with 5 waypoints
2. Scroll to waypoint 2, click "➕ Insert Below"
3. Verify inline insert form appears below waypoint 2
4. Fill in fields:
   - Name: "Detour Stop"
   - City: "TestCity"
   - Latitude: 55.1234
   - Longitude: 12.5678
   - Speed: 25
5. Expand "🔧 Sensor Properties" section
6. Check "Reefer On", set temp1 to -5°C
7. Click "✓ Add Waypoint"
8. Verify new waypoint appears at position 3 with sensor badge: "❄️ -5°/20°/20°C"
9. Verify original waypoint 3 is now at position 4
10. Click "💾 Save Route Changes"
11. Start simulation - verify route includes 6 waypoints total
12. Verify ping sent for "Detour Stop" with -5°C temperature

**Validation Testing**:
1. Click "➕ Insert Below"
2. Leave name field empty, click "✓ Add Waypoint"
3. Verify error: "⚠ Name, city, latitude, and longitude are required"
4. Fill in name, city, leave lat/lon empty
5. Verify same error
6. Fill in all fields, set lat to 100 (invalid)
7. Click "✓ Add Waypoint"
8. Verify error: "⚠ Latitude must be between -90 and 90"
9. Set lat to 50, set lon to 200 (invalid)
10. Verify error: "⚠ Longitude must be between -180 and 180"
11. Set valid lat/lon (e.g., 55.0, 12.0)
12. Verify waypoint added successfully

**Active Simulation Editing Testing**:
1. Select route with at least 5 waypoints
2. Start simulation
3. Wait for simulation to reach waypoint 2 (logs show "Ping #2: Waypoint 2...")
4. Navigate to Route Preview
5. Verify waypoint 1 shows: "✓ Already simulated" (no edit buttons)
6. Verify waypoint 2 shows: "⏩ Currently sending..." (no edit buttons)
7. Verify waypoint 3+ show: "✏️ Edit Sensors" and "➕ Insert Below" buttons
8. Try clicking on waypoint 1 (if buttons appear via console): `editWaypoint(0)`
9. Verify error: "⚠ Cannot edit current or already-simulated waypoints"
10. Click "✏️ Edit Sensors" on waypoint 4 (future waypoint)
11. Verify log message: "⏸ Simulation paused for editing"
12. Verify "(paused)" indicator appears below edit buttons
13. Change sensor values, click "✓ Apply Changes"
14. Click "💾 Save Route Changes"
15. Verify log message: "✓ Route changes applied to running simulation"
16. Verify log message: "▶ Simulation resumed"
17. Verify simulation continues from waypoint 2 (not restarted)
18. Wait for waypoint 4 - verify payload has edited sensor values

**Cancel/Discard Testing**:
1. Select custom route
2. Edit waypoint 1: Change temp1 to -15°C, apply changes
3. Edit waypoint 2: Check "Door 1 Open", apply changes
4. Edit waypoint 3: Uncheck "Coupled", apply changes
5. Verify all 3 waypoints show updated badges
6. Click "✕ Discard All Changes"
7. Verify confirmation dialog appears
8. Click "OK" to confirm
9. Verify all edits reverted (waypoints show original sensor values)
10. Verify no sensor badges if all defaults
11. Check localStorage: Verify route unchanged

**Cancel Single Edit Testing**:
1. Select route
2. Click "✏️ Edit Sensors" on waypoint 2
3. Change multiple sensor values (don't apply yet)
4. Click "✕ Cancel"
5. Verify form closes
6. Verify no changes applied to waypoint (sensor badges unchanged)
7. Click "✏️ Edit Sensors" again on same waypoint
8. Verify original values still present (not the cancelled changes)

**Concurrent Route Selection Testing**:
1. Select route A
2. Edit waypoint 1, apply changes (don't save route yet)
3. Use dropdown to select route B
4. Verify confirmation dialog: "Discard unsaved changes to current route?"
5. Click "Cancel" - verify dropdown reverts to route A
6. Verify edit mode still active (changes not lost)
7. Try switching routes again
8. Click "OK" to confirm discard
9. Verify route B loads in preview
10. Verify edit mode exited
11. Select route A again - verify edits were discarded (original values)

**Pause/Resume Edge Cases**:
1. Start simulation
2. Navigate to waypoint 3
3. Edit waypoint 5 (simulation pauses)
4. Click "✕ Discard All Changes"
5. Verify simulation resumes automatically
6. Stop simulation manually
7. Edit waypoint 2
8. Verify no pause (simulation not running)
9. Start simulation again
10. Verify simulation uses original route (edits were discarded)

**Insert During Simulation Testing**:
1. Start route simulation (5 waypoints)
2. Wait for waypoint 2
3. Click "➕ Insert Below" on waypoint 4
4. Verify inline form appears (simulation pauses)
5. Fill in waypoint details: "Emergency Stop", lat: 54.0, lon: 10.0
6. Click "✓ Add Waypoint"
7. Verify new waypoint inserted at position 5
8. Click "💾 Save Route Changes"
9. Verify simulation resumes
10. Wait for simulation to reach new waypoint 5
11. Verify log shows: "Ping #5: Emergency Stop (Waypoint 5/6)"
12. Verify payload contains correct lat/lon (54.0, 10.0)

**Payload Integration Testing**:
1. Create custom route with varied sensor values:
   - WP1: Reefer on, -10°C/-5°C/0°C, Door1 open
   - WP2: Reefer on, -15°C/-15°C/-15°C, both doors closed
   - WP3: Reefer off, 20°C, both doors open, uncoupled
2. Start simulation
3. Capture network request for ping #1 (DevTools > Network > Payload)
4. Verify WP1 payload:
   - `boxdata.reefer.BD_REEFER_ON: true`
   - `boxdata.reefer.BD_TEMP1: -10`
   - `boxdata.reefer.BD_TEMP2: -5`
   - `boxdata.reefer.BD_TEMP3: 0`
   - `boxdata.door.BD_DOOR_OPEN: true`
   - `boxdata.door.BD_DOOR_OPEN_2: false`
   - `boxdata.BD_COUPLED: true`
5. Wait for ping #2, capture request
6. Verify WP2 payload: temps are -15°C, doors closed
7. Wait for ping #3, capture request
8. Verify WP3 payload: reefer off, temps 20°C, doors open, coupled false

**State Persistence Testing**:
1. Select route, enter edit mode
2. Edit 2 waypoints, apply changes (don't save route)
3. Refresh page (Ctrl+R)
4. Verify route loads in read-only mode (edit mode exited)
5. Verify uncommitted edits were lost (not persisted)
6. Edit same waypoints again, apply changes
7. Click "💾 Save Route Changes"
8. Refresh page
9. Verify edits persisted (sensor badges show edited values)

### Web Worker Testing

Test background execution:
- Start simulation, switch to another tab
- Monitor logs tab to verify pings continue at set interval
- Check DevTools console for visibility change messages
- Verify ping timing remains accurate when tab is hidden

### PWA Installation Testing

**Desktop (Chrome/Edge)**:
1. Clear site data and reload
2. Verify install prompt appears
3. Click "Install" - app should open in standalone window
4. Verify app appears in Start Menu/Applications
5. Test "Later" dismissal - should not reappear for 7 days

**Android**:
1. Open in Chrome, look for install banner
2. Tap "Install" or use menu > Install app
3. Verify icon on home screen with correct logo
4. Launch from home screen - opens standalone (no browser UI)
5. Test all simulation modes work when installed

**iOS**:
1. Open in Safari, tap Share button
2. Tap "Add to Home Screen"
3. Verify correct icon appears (180x180)
4. Launch from home screen
5. Test functionality when installed

### Offline Support Testing

**Offline Mode**:
1. Start simulation with valid backend
2. Open DevTools > Network tab > Check "Offline"
3. Verify offline indicator banner appears
4. Watch logs - pings should queue: "📦 Ping queued (3 pending)"
5. Uncheck "Offline"
6. Verify automatic sync: "🔄 Syncing 3 queued pings..."
7. Verify success: "✓ Synced 3 pings"

**Queue Persistence**:
1. Go offline, start simulation, queue some pings
2. Close browser completely
3. Reopen app
4. Check logs: "📦 5 pings queued from previous session"
5. Go online - should auto-sync

**Background Sync (Android Chrome only)**:
1. Queue failed pings while offline
2. Close app completely
3. Restore network connection
4. Reopen app later
5. Check if pings synced in background (may require waiting)

### Service Worker Testing

**Cache Validation**:
1. DevTools > Application > Cache Storage
2. Verify two caches exist: eg-telematics-v1.2.0 and runtime
3. Check cached resources include HTML, manifest, icons

**Offline Loading**:
1. Load app online (ensure cached)
2. DevTools > Network > Offline
3. Reload page - should load from cache
4. All static resources should work offline

**Update Detection**:
1. Modify service-worker.js (change CACHE_VERSION)
2. Deploy to server
3. Wait up to 1 hour or trigger manually: `registration.update()`
4. Verify update banner appears
5. Click "Update" - app should reload with new version

### Lighthouse Audit

Run Lighthouse PWA audit (DevTools > Lighthouse):
- Target score: 90+
- Check for manifest errors
- Verify all icons load
- Check service worker registration
- Validate offline capability

### Common Issues to Check

**Install Prompt Not Showing**:
- Verify HTTPS or localhost
- Check manifest.json has no errors (DevTools > Application > Manifest)
- Ensure icons are accessible (check Network tab)
- Check if recently dismissed: `localStorage.getItem('installPromptDismissed')`

**Offline Mode Not Working**:
- Verify service worker is activated (DevTools > Application > Service Workers)
- Check cache storage has resources
- Ensure online/offline event listeners attached

**Queued Pings Not Syncing**:
- Check console for errors
- Verify `localStorage.getItem('failedPingsQueue')`
- Manually trigger: `syncFailedPings()` in console
- Check network tab for failed requests during sync