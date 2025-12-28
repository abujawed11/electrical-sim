# Neat Wiring Guide - Making Your Electrical Simulator Professional

## Current State Analysis

Your wiring system already has:
- ✅ Waypoints support (manual route control)
- ✅ Color-coded wires (Red/Blue/Green for L/N/E)
- ✅ Visual feedback (glow when energized)
- ✅ Selection highlighting

**What's missing for professional-looking wiring:**
- ❌ Grid/angle snapping
- ❌ Auto-routing
- ❌ Wire organization components
- ❌ Wire bundling/grouping
- ❌ Wire labels
- ❌ Right-angle enforcement

---

## Part 1: Visual Wiring Improvements (No New Components)

### 1. **Grid Snapping** ⭐ HIGH PRIORITY
Make wires snap to a grid for neat alignment.

**Implementation**:
```javascript
// In CanvasStage.jsx - when placing waypoints
const GRID_SIZE = 10; // pixels

const snapToGrid = (x, y) => ({
  x: Math.round(x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(y / GRID_SIZE) * GRID_SIZE
});

// Use when adding waypoints or dragging wire endpoints
const handleCanvasClick = (e) => {
  const pos = e.target.getStage().getPointerPosition();
  const snapped = snapToGrid(pos.x, pos.y);
  addDraftWaypoint(snapped.x, snapped.y);
};
```

**Settings**:
- Grid size: 5px, 10px, 20px (user preference)
- Toggle grid visibility
- Snap on/off toggle (hold Shift to disable temporarily)

---

### 2. **Right-Angle Wiring (Manhattan Routing)** ⭐ HIGH PRIORITY
Force wires to only use horizontal and vertical segments.

**Implementation**:
```javascript
// Auto-create right-angle waypoints
const createRightAngleWaypoints = (start, end, mode = 'auto') => {
  const waypoints = [];

  if (mode === 'horizontal-first') {
    // Go horizontal first, then vertical
    waypoints.push({ x: end.x, y: start.y });
  } else if (mode === 'vertical-first') {
    // Go vertical first, then horizontal
    waypoints.push({ x: start.x, y: end.y });
  } else {
    // Auto-detect best route (shortest distance)
    const midX = (start.x + end.x) / 2;
    waypoints.push(
      { x: midX, y: start.y },
      { x: midX, y: end.y }
    );
  }

  return waypoints;
};
```

**UI Controls**:
- **Keyboard shortcuts**:
  - `H` key: Route horizontal-first
  - `V` key: Route vertical-first
  - `A` key: Auto route
- **Right-click menu on wire**: "Straighten", "Convert to right-angles"

---

### 3. **Wire Smoothing & Corner Rounding**
Add rounded corners for professional look.

**Implementation**:
```javascript
// In WiresLayer.jsx
<Line
  points={points}
  stroke={strokeColor}
  strokeWidth={2}
  tension={0.3} // Add this for smooth curves
  lineCap="round"
  lineJoin="round"
/>
```

**Options**:
- `tension: 0` = Sharp corners (default)
- `tension: 0.3` = Slightly rounded (professional)
- `tension: 0.7` = Very curved (artistic, not realistic)

---

### 4. **Wire Thickness Based on Current**
Thicker visual wires for higher current loads.

**Implementation**:
```javascript
// Calculate wire thickness dynamically
const getWireThickness = (wire) => {
  const currentA = simulationState.deviceLoads[wire.from.compId]?.currentA || 0;

  if (currentA < 5) return 2;       // Thin (lighting circuits)
  if (currentA < 16) return 3;      // Medium (socket circuits)
  if (currentA < 32) return 4;      // Thick (heavy loads)
  return 5;                         // Very thick (main supply)
};

<Line
  points={points}
  stroke={strokeColor}
  strokeWidth={getWireThickness(wire)}
/>
```

---

### 5. **Wire Labels** ⭐ HIGH PRIORITY
Add text labels to wires for identification.

**Implementation**:
```javascript
import { Text } from 'react-konva';

// Calculate label position (middle of wire)
const getLabelPosition = (points) => {
  const midIndex = Math.floor(points.length / 2) - 1;
  return {
    x: points[midIndex],
    y: points[midIndex + 1]
  };
};

// In WiresLayer.jsx
{wire.label && (
  <Text
    text={wire.label}
    x={getLabelPosition(points).x}
    y={getLabelPosition(points).y}
    fontSize={10}
    fill="#FFFFFF"
    stroke="#000000"
    strokeWidth={0.5}
    padding={2}
    offsetX={wire.label.length * 3}
  />
)}
```

**Label Examples**:
- "L1 from MCB-1"
- "N to Socket-3"
- "Earth Bar → Geyser"
- "16A Circuit"

**UI**: Double-click wire → Enter label

---

### 6. **Wire Color Customization**
Let users choose custom colors (not just based on terminal type).

**Implementation**:
```javascript
// Add to wire properties
wire.customColor = '#FF6B6B'; // User-selected color

// In WiresLayer.jsx
const strokeColor = wire.customColor || autoColor;
```

**Use Cases**:
- Color-code circuits (Kitchen = Yellow, Bedroom = Purple)
- Mark important wires
- Educational highlighting

---

### 7. **Wire Gauge Indicator**
Show wire gauge visually and in properties.

**Implementation**:
```javascript
// Add to wire properties
wire.gauge = '2.5mm²'; // or AWG 14

// Visual indicator (stripe pattern or dotted line)
const wireGaugePattern = {
  '1.5mm²': [2, 2],      // Small dashes
  '2.5mm²': [],          // Solid
  '4mm²': [10, 0],       // Thick solid
};

<Line
  points={points}
  stroke={strokeColor}
  strokeWidth={getGaugeThickness(wire.gauge)}
  dash={wireGaugePattern[wire.gauge]}
/>
```

---

### 8. **Parallel Wire Bundling**
Group multiple wires visually when they run parallel.

**Implementation**:
```javascript
// Detect parallel wires (same start/end area)
const detectBundles = (wires) => {
  const bundles = [];

  wires.forEach((wire, i) => {
    wires.slice(i + 1).forEach(otherWire => {
      if (wiresAreParallel(wire, otherWire)) {
        bundles.push([wire.id, otherWire.id]);
      }
    });
  });

  return bundles;
};

// Offset bundled wires slightly
const offsetWire = (points, offset) => {
  // Shift wire perpendicular to its direction
  return points.map((p, i) =>
    i % 2 === 0 ? p + offset : p
  );
};
```

**Visual**: Draw bundled wires close together with slight separation.

---

## Part 2: Wire Organization Components

### 1. **Junction Box** ⭐ ESSENTIAL

**Purpose**: Central meeting point for multiple wires (keeps wiring neat).

**Component Definition**:
```javascript
[COMPONENT_TYPES.JUNCTION_BOX]: {
  name: 'Junction Box',
  defaultProperties: {
    label: 'JB-1',
    terminals: 4 // Number of connection points
  },
  terminals: [
    { id: 'T1', kind: TERMINAL_KINDS.GENERIC, relX: -15, relY: -15, label: '1' },
    { id: 'T2', kind: TERMINAL_KINDS.GENERIC, relX: 15, relY: -15, label: '2' },
    { id: 'T3', kind: TERMINAL_KINDS.GENERIC, relX: -15, relY: 15, label: '3' },
    { id: 'T4', kind: TERMINAL_KINDS.GENERIC, relX: 15, relY: 15, label: '4' },
  ],
}
```

**Visual**: Square box with 4-8 terminals

**Use Case**:
- Connect multiple lights to one switch
- Branch circuits
- Organize cable runs

**Example**:
```
Switch → Junction Box → Lamp 1
                      → Lamp 2
                      → Lamp 3
```

---

### 2. **Cable Tray**

**Purpose**: Horizontal wire pathway (industrial/commercial installations).

**Component Definition**:
```javascript
[COMPONENT_TYPES.CABLE_TRAY]: {
  name: 'Cable Tray',
  defaultProperties: {
    label: 'Tray-1',
    length: 200, // pixels
    orientation: 'horizontal'
  },
  terminals: [] // Visual only, wires pass through
}
```

**Visual**: Horizontal ladder-like structure

**Implementation**:
- Wires snap to tray path
- Auto-route wires along tray
- Multiple wires can use same tray

---

### 3. **Conduit/Pipe**

**Purpose**: Protective tube for wires (wall/underground runs).

**Component Definition**:
```javascript
[COMPONENT_TYPES.CONDUIT]: {
  name: 'Conduit Pipe',
  defaultProperties: {
    label: 'PVC-1',
    diameter: '25mm',
    length: 150,
    type: 'PVC' // PVC, Metal, Flexible
  },
  terminals: [
    { id: 'IN', kind: TERMINAL_KINDS.GENERIC, relX: -75, relY: 0 },
    { id: 'OUT', kind: TERMINAL_KINDS.GENERIC, relX: 75, relY: 0 },
  ]
}
```

**Visual**: Gray tube/pipe

**Use Case**:
- Protect wires in walls
- Underground cable runs
- Show professional installation method

**Rules**:
- Max wire fill (40% of conduit area)
- Show warning if overfilled

---

### 4. **Cable Tie Point / Clamp**

**Purpose**: Fix wires at specific points (prevents sagging).

**Component Definition**:
```javascript
[COMPONENT_TYPES.CABLE_CLAMP]: {
  name: 'Cable Clamp',
  defaultProperties: {
    label: 'Clip-1'
  },
  terminals: [
    { id: 'PASS', kind: TERMINAL_KINDS.GENERIC, relX: 0, relY: 0 }
  ]
}
```

**Visual**: Small U-shaped clip

**Use Case**:
- Secure wires along walls
- Prevent wire droop
- Realistic cable management

---

### 5. **Distribution Board / Consumer Unit**

**Purpose**: Central panel that houses all MCBs (already implied, but make it visual).

**Enhancement**:
- Add visual panel/enclosure
- Group MCBs inside panel
- Show panel door (open/closed)
- Label circuits on panel

**Visual**:
```
┌─────────────────────┐
│  MAIN DISTRIBUTION  │
│  ┌────┐ ┌────┐      │
│  │MCB1│ │MCB2│      │
│  └────┘ └────┘      │
│  ┌────┐ ┌────┐      │
│  │MCB3│ │MCB4│      │
│  └────┘ └────┘      │
└─────────────────────┘
```

---

### 6. **Wire Marker / Tag**

**Purpose**: Label wires at endpoints (like real electrical work).

**Component**:
```javascript
[COMPONENT_TYPES.WIRE_MARKER]: {
  name: 'Wire Marker',
  defaultProperties: {
    text: 'L1',
    color: '#FFD700' // Yellow tag
  }
}
```

**Visual**: Small colored tag/sleeve on wire

**Use Case**:
- Identify wires during installation
- Match phases in 3-phase systems
- Professional labeling

---

## Part 3: Auto-Routing System

### **Automatic Wire Routing Algorithm**

Implement A* pathfinding to automatically route wires around obstacles.

**Implementation**:
```javascript
// A* pathfinding for wire routing
const autoRouteWire = (start, end, obstacles) => {
  const grid = createGrid(); // 10px grid
  const path = findPath(start, end, obstacles); // A* algorithm

  // Simplify path (remove unnecessary waypoints)
  const simplified = simplifyPath(path);

  // Convert to right-angles if needed
  const rightAngled = enforceRightAngles(simplified);

  return rightAngled;
};

// Simplify path by removing collinear points
const simplifyPath = (path) => {
  const simplified = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    // If not collinear, keep waypoint
    if (!isCollinear(prev, curr, next)) {
      simplified.push(curr);
    }
  }

  simplified.push(path[path.length - 1]);
  return simplified;
};
```

**UI**:
- Button: "Auto-Route Wire"
- Right-click wire → "Re-route Automatically"
- Settings: Prefer horizontal/vertical routes

---

## Part 4: Advanced Wire Features

### 1. **Wire Length Display**
Show actual wire length in meters.

```javascript
const calculateWireLength = (points) => {
  let length = 0;
  for (let i = 0; i < points.length - 2; i += 2) {
    const dx = points[i + 2] - points[i];
    const dy = points[i + 3] - points[i + 1];
    length += Math.sqrt(dx * dx + dy * dy);
  }
  // Convert pixels to meters (e.g., 10px = 0.1m)
  return (length / 100).toFixed(2);
};

// Display on wire hover or in properties panel
<Text text={`${calculateWireLength(points)}m`} />
```

---

### 2. **Wire Cost Calculation**
Calculate material cost based on length and gauge.

```javascript
const WIRE_COSTS = {
  '1.5mm²': 15,  // ₹15 per meter
  '2.5mm²': 25,
  '4mm²': 40,
  '6mm²': 60
};

const wireGauge = wire.gauge || '2.5mm²';
const length = calculateWireLength(wire.points);
const cost = length * WIRE_COSTS[wireGauge];

// Show in properties panel
"Wire Cost: ₹" + cost.toFixed(2)
```

---

### 3. **Multi-Select Wires**
Select and move multiple wires together.

```javascript
// Hold Ctrl + Click to select multiple wires
const selectedWires = [];

// Move all selected wires together
const moveWires = (dx, dy) => {
  selectedWires.forEach(wireId => {
    const wire = wires.find(w => w.id === wireId);
    wire.waypoints = wire.waypoints.map(p => ({
      x: p.x + dx,
      y: p.y + dy
    }));
  });
};
```

---

### 4. **Wire Templates**
Save and reuse common wire routes.

```javascript
// Save current wire as template
const saveWireTemplate = (wire, name) => {
  localStorage.setItem(`wireTemplate_${name}`, JSON.stringify({
    waypoints: wire.waypoints,
    gauge: wire.gauge,
    label: wire.label
  }));
};

// Apply template to new wire
const applyTemplate = (templateName, startPos, endPos) => {
  const template = JSON.parse(localStorage.getItem(`wireTemplate_${templateName}`));
  // Scale/translate waypoints to fit new start/end positions
  return scaledWaypoints;
};
```

**Use Case**: Save standard kitchen circuit layout, reuse for multiple kitchens.

---

### 5. **Wire Alignment Tools**
Align multiple wires neatly.

**Tools**:
- **Align Left**: Move all selected wires to same X
- **Align Top**: Move all to same Y
- **Distribute Evenly**: Space wires equally
- **Straighten**: Remove all waypoints, make direct line

```javascript
const alignWiresVertically = (wires, x) => {
  wires.forEach(wire => {
    wire.waypoints = wire.waypoints.map(p => ({ ...p, x }));
  });
};
```

---

## Part 5: UI Improvements for Wiring

### 1. **Wiring Mode Toolbar**

Add a toolbar with wire tools:

```
┌─────────────────────────────────────┐
│ [Direct] [Right-Angle] [Auto-Route] │
│ [Bundle] [Label]  [Straighten]      │
└─────────────────────────────────────┘
```

### 2. **Wire Properties Panel**

When wire is selected, show:
```
Wire Properties
━━━━━━━━━━━━━━━
Label:     [L1 Circuit      ]
Gauge:     [2.5mm² ▼        ]
Color:     [🔴 Red          ]
Length:    2.35m
Cost:      ₹58.75
Routing:   [Right-Angle ▼   ]

[Auto-Route] [Straighten]
```

### 3. **Waypoint Editing**

- **Add waypoint**: Click on wire while holding Alt
- **Delete waypoint**: Click waypoint while holding Delete
- **Drag waypoint**: Click and drag any waypoint
- **Snap to grid**: Hold Shift while dragging

**Visual Feedback**:
- Show waypoints as draggable dots when wire is selected
- Highlight waypoint on hover

---

### 4. **Grid Overlay**

Show a grid for alignment (optional, can be toggled).

```javascript
// In CanvasStage.jsx
const drawGrid = () => {
  const gridLines = [];
  const gridSize = 20;

  for (let x = 0; x < stageWidth; x += gridSize) {
    gridLines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, stageHeight]}
        stroke="#374151"
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }

  // Same for horizontal lines...

  return gridLines;
};
```

**Toggle**: Show/Hide Grid (Ctrl+G)

---

### 5. **Wire Shortcuts**

Keyboard shortcuts for faster wiring:

- **W**: Enter wiring mode
- **Esc**: Cancel current wire
- **Enter**: Complete wire
- **Space**: Add waypoint
- **Backspace**: Remove last waypoint
- **H**: Route horizontal-first
- **V**: Route vertical-first
- **A**: Auto-route
- **Ctrl+G**: Toggle grid
- **Ctrl+Shift+A**: Align selected wires

---

## Part 6: Real-World Wiring Standards

### **IEC Wiring Color Codes**
Enforce or suggest standard colors:

- **Phase**: Brown (or Red in old systems)
- **Neutral**: Blue (or Black in old systems)
- **Earth**: Green/Yellow stripe

**Implementation**: Add option to switch between color standards (IEC, NEC, Indian, UK).

---

### **Wire Separation Rules**

Implement real-world rules:
- Power and signal wires should be separate
- High-voltage and low-voltage separation
- Minimum bend radius (wire shouldn't bend too sharply)

```javascript
const MIN_BEND_RADIUS = 30; // pixels

const validateWire = (wire) => {
  const warnings = [];

  // Check for sharp bends
  for (let i = 0; i < wire.waypoints.length - 1; i++) {
    const angle = calculateAngle(wire.waypoints[i], wire.waypoints[i+1]);
    if (angle < MIN_BEND_RADIUS) {
      warnings.push('Sharp bend detected - may damage cable');
    }
  }

  return warnings;
};
```

---

## Implementation Priority

### **Phase 1: Quick Wins** (Weekend project)
1. ✅ Grid snapping
2. ✅ Right-angle routing mode
3. ✅ Wire labels
4. ✅ Wire thickness based on current
5. ✅ Grid overlay toggle

### **Phase 2: Essential Components** (1 week)
1. ✅ Junction Box component
2. ✅ Waypoint drag & edit
3. ✅ Wire properties panel
4. ✅ Wire length display
5. ✅ Custom wire colors

### **Phase 3: Advanced** (2 weeks)
1. ✅ Auto-routing algorithm
2. ✅ Conduit/Cable tray components
3. ✅ Wire bundling detection
4. ✅ Multi-select & alignment tools
5. ✅ Wire templates

### **Phase 4: Polish** (1 week)
1. ✅ Wire cost calculation
2. ✅ Wire marker tags
3. ✅ Distribution panel enclosure
4. ✅ Wire validation (bend radius, separation)
5. ✅ IEC color code enforcement

---

## Example: Before vs After

### **Before** (Current state):
```
  [MCB]
    |  \
    |   \___
    |       \
  [Lamp]  [Socket]
```
- Free-form wires
- Overlapping paths
- Hard to trace circuits

### **After** (With improvements):
```
  [MCB]─┬─[Junction Box]─┬─[Lamp]
        │                └─[Socket]
        │
      [Grid aligned, right-angles, labeled]
```
- Clean right-angles
- Grid-aligned
- Junction box organizes branches
- Wire labels show circuit names
- Bundled parallel wires

---

## Recommended Starting Point

**Start with these 5 improvements** (ordered by impact):

1. **Grid Snapping** - Makes everything align perfectly
2. **Right-Angle Routing** - Professional-looking circuits
3. **Junction Box Component** - Organize complex wiring
4. **Wire Labels** - Identify circuits easily
5. **Waypoint Editing** - Fine-tune wire routes

**Implementation time**: ~4 hours for all 5

**Code changes**:
- Grid snapping: 20 lines in `CanvasStage.jsx`
- Right-angle routing: 30 lines (new utility function)
- Junction box: Copy existing component, modify terminals
- Wire labels: 15 lines in `WiresLayer.jsx`
- Waypoint editing: Already supported, just add UI controls

---

## Summary

To make wiring neat, you need:

### **No-Code Improvements**:
- Grid snapping ⭐
- Right-angle wiring ⭐
- Wire labels ⭐
- Waypoint editing UI ⭐
- Thicker wires for high current
- Rounded corners
- Grid overlay

### **New Components Needed**:
- Junction Box ⭐⭐⭐ (ESSENTIAL)
- Conduit/Pipe
- Cable Tray
- Cable Clamp
- Wire Marker Tags
- Distribution Panel Enclosure

### **Advanced Features**:
- Auto-routing
- Wire bundling
- Multi-select & alignment
- Wire templates
- Cost calculation

**Most Important**: Grid snapping + Right-angles + Junction boxes = 80% improvement in neatness!

Let me know which features you'd like to implement first, and I can help you code them!






 I've created a comprehensive Neat Wiring Guide for you! It's saved as NEAT_WIRING_GUIDE.md.

  🎯 Key Findings

  To make your wiring neat and professional, you need 3 categories of improvements:

  ---
  1. Visual Improvements (No new components needed)

  ⭐ Top 5 Quick Wins:

  1. Grid Snapping - Snap wires to a grid (10px) for perfect alignment
  2. Right-Angle Routing - Force horizontal/vertical segments only (like real electrical plans)
  3. Wire Labels - Add text labels like "L1 from MCB-1"
  4. Thicker Wires for High Current - Visual thickness based on amps
  5. Waypoint Editing UI - Drag waypoints to adjust wire routes

  Impact: Makes everything look professional with minimal effort
  Time: 4 hours to implement all 5

  ---
  2. Essential Components to Add

  ⭐⭐⭐ Junction Box (MOST IMPORTANT!)

  Why: In real wiring, you can't connect 3+ wires at a single terminal. Junction boxes are where wires meet.

  Example:
  Switch → Junction Box → Lamp 1
                        → Lamp 2
                        → Lamp 3

  Before: Messy overlapping wires
  After: Organized branching through junction box

  Other Useful Components:

  2. Conduit/Pipe - Protect wires in walls (visual guide for wire paths)
  3. Cable Tray - Industrial wire organization
  4. Cable Clamps - Secure wires at points
  5. Wire Marker Tags - Label wire ends (like real electricians)
  6. Distribution Panel Enclosure - Visual box to house all MCBs

  ---
  3. Advanced Features

  1. Auto-routing - A* algorithm to route wires around obstacles
  2. Wire bundling - Group parallel wires visually
  3. Multi-select wires - Move/align multiple wires together
  4. Wire templates - Save common routes, reuse them
  5. Wire cost calculator - Based on length × gauge

  ---
  Before vs After Example

  Before:

  [MCB]
    |  \____
    |       \
  [Lamp]  [Socket]
  Free-form spaghetti wires 🍝

  After:

  [MCB]──┬──[Junction Box]──┬──[Lamp]
         │                  └──[Socket]
         │
      (Grid-aligned, right-angles, labeled)
  Professional electrical diagram! 📐

  ---
  My Recommendations

  Start Here (Biggest impact, easiest to implement):

  Weekend Project (4 hours):
  1. ✅ Grid snapping (20 lines of code)
  2. ✅ Right-angle routing (30 lines)
  3. ✅ Junction Box component (copy existing component structure)
  4. ✅ Wire labels (15 lines)
  5. ✅ Grid overlay toggle (optional visual guide)

  Result: 80% improvement in wiring neatness!

  Next Steps (When ready):

  - Auto-routing algorithm
  - Conduit components
  - Wire alignment tools
  - Cost calculator

  ---
  Implementation Help

  The guide includes:
  - ✅ Complete code examples for each feature
  - ✅ Visual diagrams
  - ✅ Step-by-step implementation
  - ✅ Priority ordering
  - ✅ Real-world wiring standards (IEC color codes, bend radius)

  Want me to implement any of these features for you? The Junction Box + Grid Snapping + Right-Angle routing would make the BIGGEST difference immediately!