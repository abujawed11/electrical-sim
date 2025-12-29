import { COMPONENT_TYPES } from '../types';

export const LESSON_PATH_THREE_PHASE = [
  {
    id: 'T1',
    title: 'Introduction to 3-Phase Power',
    description: `
🔌 WHAT IS 3-PHASE POWER?

Think of pushing a car:
• Single-Phase: YOU push alone → Push, wait, push, wait (Pulsating)
• 3-Phase: THREE people take turns pushing → Continuous smooth power!

🌟 WHY 3-PHASE?
✓ Constant power (never drops to zero)
✓ Motors run smoother (self-starting, no vibration)
✓ More efficient (1.732x more power with same wires!)
✓ Used in factories, big buildings, industries

📊 THE THREE PHASES:
• Red (R) - Phase 1
• Yellow (Y) - Phase 2
• Blue (B) - Phase 3
• Neutral (N) - Common return path
• Earth (E) - Safety

Each phase is 120° apart in time. When R is at peak, Y and B are at different points!

🎯 YOUR TASK: Place a 3-Phase Supply to see the 5 terminals (R, Y, B, N, E).
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'place_supply', label: 'Place 3-Phase Supply from toolbox' },
    ],
    validate: (components) => components.some(c => c.type === COMPONENT_TYPES.SUPPLY_3P),
  },
  {
    id: 'T2',
    title: 'Understanding Voltage: Line vs Phase',
    description: `
⚡ TWO TYPES OF VOLTAGE IN 3-PHASE!

This is the MOST confusing part - pay attention!

📐 PHASE VOLTAGE (Vph):
• Measured between ANY phase and Neutral
• Examples: R-to-N, Y-to-N, B-to-N
• Value: 230V (in India/Europe)

📐 LINE VOLTAGE (VL):
• Measured between ANY two phases
• Examples: R-to-Y, Y-to-B, B-to-R
• Value: 415V (in India/Europe)

🧮 THE MAGIC FORMULA:
Line Voltage = √3 × Phase Voltage
415V = 1.732 × 230V

WHY √3 and not 2? Because phases are 120° apart, not parallel!

🏠 REAL-WORLD USE:
• Your home socket: 230V (Phase-to-Neutral)
• Big AC or motor: 415V (Phase-to-Phase)
• Factory machines: 415V (all 3 phases)

🎯 YOUR TASK: Enable the 3-phase supply and watch the voltage indicators!
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'enable_supply', label: 'Turn ON the 3-Phase Supply' },
    ],
    validate: (components) => {
      const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
      return supply && supply.properties.enabled;
    }
  },
  {
    id: 'T3',
    title: 'First 3-Phase Connection: Motor',
    description: `
🔧 CONNECTING A 3-PHASE MOTOR (Balanced Load)

Motors are the most common 3-phase load. They need ALL 3 phases to work!

📋 CONNECTION RULES:
1. Connect R-to-R (Red phase to Red terminal)
2. Connect Y-to-Y (Yellow phase to Yellow terminal)
3. Connect B-to-B (Blue phase to Blue terminal)
4. Connect E-to-E (Earth for safety - IMPORTANT!)

⚠️ WHAT HAPPENS IF YOU MIX UP PHASES?
• R-to-Y connection? Motor runs BACKWARD!
• Missing one phase? Single-phasing → Motor overheats and burns!

🎯 BALANCED LOAD:
A 3-phase motor draws EQUAL current from all 3 phases:
• R: 10A
• Y: 10A
• B: 10A
• Neutral: 0A (currents cancel out perfectly!)

🎯 YOUR TASK: Place a 3-Phase Motor and wire it correctly to the supply.
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'place_load', label: 'Place 3-Phase Motor (Load)' },
      { id: 'conn_r', label: 'Connect Supply R → Motor R' },
      { id: 'conn_y', label: 'Connect Supply Y → Motor Y' },
      { id: 'conn_b', label: 'Connect Supply B → Motor B' },
      { id: 'conn_earth', label: 'Connect Earth (E → E)' },
    ],
    validate: (components, wires) => {
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
        const load = components.find(c => c.type === COMPONENT_TYPES.LOAD_3P_BALANCED);
        if (!supply || !load) return false;

        const isConn = (t1, t2) => wires.some(w =>
            (w.from.compId === supply.id && w.from.terminalId === t1 && w.to.compId === load.id && w.to.terminalId === t2) ||
            (w.from.compId === load.id && w.from.terminalId === t2 && w.to.compId === supply.id && w.to.terminalId === t1)
        );

        return isConn('R', 'R') && isConn('Y', 'Y') && isConn('B', 'B') && isConn('E', 'E');
    }
  },
  {
    id: 'T4',
    title: 'Transformers: What & Why?',
    description: `
🔌 WHAT IS A TRANSFORMER?

A magic box that changes voltage UP or DOWN without changing frequency!

📊 HOW IT WORKS (Simple):
1. High voltage goes into PRIMARY side (e.g., 11,000V)
2. Creates changing magnetic field in iron core
3. SECONDARY side picks up the magnetic field
4. Outputs lower voltage (e.g., 415V)

🧮 THE FORMULA:
Vp / Vs = Np / Ns

Where:
• Vp = Primary voltage (11kV)
• Vs = Secondary voltage (415V)
• Np/Ns = Turns ratio (26.5:1)

🏭 REAL-WORLD PATH:
Power Plant (11kV)
  → Step-UP Transformer (11kV → 400kV) for transmission
  → Step-DOWN Transformer (400kV → 132kV → 11kV)
  → Distribution Transformer (11kV → 415V)
  → YOUR FACTORY/HOME!

❓ WHY NOT JUST USE 11kV EVERYWHERE?
• Too dangerous for homes!
• Need transformers to make it safe (415V/230V)

🎯 YOUR TASK: Place a 3-Phase Transformer and explore its terminals (HV and LV sides).
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.TRANSFORMER_3P],
    checklist: [
      { id: 'place_tx', label: 'Place 3-Phase Transformer from toolbox' },
    ],
    validate: (components) => components.some(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P),
  },
  {
    id: 'T5',
    title: 'Transformer Primary Connection',
    description: `
🔌 CONNECTING THE PRIMARY (High Voltage) SIDE

The Primary side connects to the HIGH voltage source (e.g., 11kV from grid).

📋 TRANSFORMER TERMINALS:
PRIMARY (HV):
• HV-R (Red) - Primary Phase R
• HV-Y (Yellow) - Primary Phase Y
• HV-B (Blue) - Primary Phase B

SECONDARY (LV):
• r (red lowercase) - Secondary Phase R
• y (yellow lowercase) - Secondary Phase Y
• b (blue lowercase) - Secondary Phase B
• n - Neutral (only on Star-connected secondary!)

🎯 CONNECTION RULES:
1. Supply R → Transformer HV-R
2. Supply Y → Transformer HV-Y
3. Supply B → Transformer HV-B

⚠️ DANGER: Primary side has HIGH voltage! In real life, only trained electricians work on this!

🎯 YOUR TASK: Connect the 3-Phase Supply to the Transformer PRIMARY terminals.
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.TRANSFORMER_3P],
    checklist: [
      { id: 'conn_r', label: 'Connect Supply R → Transformer HV-R (PRI_R)' },
      { id: 'conn_y', label: 'Connect Supply Y → Transformer HV-Y (PRI_Y)' },
      { id: 'conn_b', label: 'Connect Supply B → Transformer HV-B (PRI_B)' },
    ],
    validate: (components, wires) => {
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
        const tx = components.find(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P);
        if (!supply || !tx) return false;

        const isConn = (t1, t2) => wires.some(w =>
            (w.from.compId === supply.id && w.from.terminalId === t1 && w.to.compId === tx.id && w.to.terminalId === t2) ||
            (w.from.compId === tx.id && w.from.terminalId === t2 && w.to.compId === supply.id && w.to.terminalId === t1)
        );

        return isConn('R', 'PRI_R') && isConn('Y', 'PRI_Y') && isConn('B', 'PRI_B');
    }
  },
  {
    id: 'T6',
    title: 'Transformer Secondary: Power Your Load',
    description: `
⚡ SECONDARY (Low Voltage) SIDE

Once the transformer steps down voltage, the SECONDARY provides safe 415V/230V for use!

📊 WHAT YOU GET:
If Primary has 11,000V, Secondary outputs:
• Line Voltage: 415V (r-to-y, y-to-b, b-to-r)
• Phase Voltage: 230V (r-to-n, y-to-n, b-to-n)

🔌 SECONDARY TERMINALS:
• SEC_R (r) - Secondary Phase R
• SEC_Y (y) - Secondary Phase Y
• SEC_B (b) - Secondary Phase B
• SEC_N (n) - Neutral point (for Star connection)

🎯 CONNECTING A MOTOR:
Connect motor to secondary just like you did in Lesson T3:
• Transformer r → Motor R
• Transformer y → Motor Y
• Transformer b → Motor B
• Transformer n → Not used for balanced 3-phase loads

🎯 YOUR TASK: Connect a 3-Phase Motor to the Transformer SECONDARY.
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.TRANSFORMER_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'place_motor', label: 'Place 3-Phase Motor' },
      { id: 'conn_sec_r', label: 'Connect TX Secondary r (SEC_R) → Motor R' },
      { id: 'conn_sec_y', label: 'Connect TX Secondary y (SEC_Y) → Motor Y' },
      { id: 'conn_sec_b', label: 'Connect TX Secondary b (SEC_B) → Motor B' },
    ],
    validate: (components, wires) => {
        const tx = components.find(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P);
        const load = components.find(c => c.type === COMPONENT_TYPES.LOAD_3P_BALANCED);
        if (!tx || !load) return false;

        const isConn = (t1, t2) => wires.some(w =>
            (w.from.compId === tx.id && w.from.terminalId === t1 && w.to.compId === load.id && w.to.terminalId === t2) ||
            (w.from.compId === load.id && w.from.terminalId === t2 && w.to.compId === tx.id && w.to.terminalId === t1)
        );

        return isConn('SEC_R', 'R') && isConn('SEC_Y', 'Y') && isConn('SEC_B', 'B');
    }
  },
  {
    id: 'T7',
    title: '⚠️ Single-Phasing: The Silent Killer',
    description: `
💀 WHAT IS SINGLE-PHASING?

When a 3-phase motor LOSES 1 or 2 phases but keeps running!

Normal: R ✓, Y ✓, B ✓ (All OK)
Single-Phasing: R ✓, Y ✗, B ✓ (Yellow phase lost!)

🔥 WHY IS IT DANGEROUS?

The motor DOESN'T STOP - that's the problem!

What happens:
• Motor struggles to run on 2 phases
• Current in remaining phases DOUBLES
• Motor OVERHEATS rapidly
• Winding insulation burns
• Motor FAILS in minutes!
• Fire risk!

Real cost: ₹50,000 motor destroyed!

📋 CAUSES:
• Blown fuse in one phase
• Loose wire connection
• MCB trips on one phase
• Broken wire

🛡️ PROTECTION:
✓ Phase Failure Relay (detects missing phase)
✓ Thermal Overload Relay (detects overcurrent)
✓ Current Imbalance Protection

⚠️ IN THIS SIMULATOR:
We detect single-phasing and show WARNING!
Motor won't run if any phase is missing (realistic behavior).

🎯 YOUR TASK: Try to run a motor with only 2 phases connected and see the warning!
(This lesson is informational - you'll pass when you read this)
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'understand', label: 'Understand single-phasing danger' },
    ],
    validate: () => true, // Auto-pass after reading
  },
  {
    id: 'T8',
    title: '3-Phase in Your HOME!',
    description: `
🏠 3-PHASE SUPPLY FOR HOMES

Wait... 3-Phase is not just for factories! Large homes also use it!

❓ WHY WOULD A HOME NEED 3-PHASE?

Your home needs 3-phase if you have:
• Multiple ACs (2-3 units) - Heavy load!
• Electric geyser (2000W) + AC running together
• Washing machine + Dryer + Microwave
• Total load > 7-8 kW

🔌 WHAT YOU GET FROM ELECTRICITY BOARD:

Single-Phase Home:
  - 2 wires: L (Phase) + N (Neutral) + E (Earth)
  - Voltage: 230V only
  - Max load: ~5-7 kW

3-Phase Home:
  - 4 wires: R + Y + B + N + E
  - Voltages: 230V (each phase) + 415V (between phases)
  - Max load: ~15-20 kW (distributed)

📊 HOW IT WORKS IN YOUR HOME:

The electricity board gives you 3 phases, but:
• Kitchen gets R phase (Geyser, Microwave)
• Bedroom 1 gets Y phase (AC-1, Lights)
• Bedroom 2 gets B phase (AC-2, Lights)
• All share the same Neutral (N)

Each room gets 230V (just like single-phase)!

🎯 YOUR TASK: Understand why homes need 3-phase.
(This is educational - click anywhere to continue)
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'understand', label: 'Understand 3-phase in homes' },
    ],
    validate: () => true, // Auto-pass
  },
  {
    id: 'T9',
    title: '3-Phase Energy Meter',
    description: `
⚡ 3-PHASE ENERGY METER (The Difference!)

❓ DO I NEED A DIFFERENT METER?

YES! 3-phase homes need a **3-phase energy meter**.

📊 SINGLE-PHASE METER:
Terminals: L-IN, N-IN, L-OUT, N-OUT (4 terminals)
Measures: Power from 1 phase only

📊 3-PHASE METER:
Terminals: R-IN, Y-IN, B-IN, N-IN, R-OUT, Y-OUT, B-OUT, N-OUT (8 terminals!)
Measures: Power from ALL 3 phases combined

🔌 HOW TO CONNECT:

FROM SUPPLY:
• Supply R → Meter R-IN
• Supply Y → Meter Y-IN
• Supply B → Meter B-IN
• Supply N → Meter N-IN

TO YOUR HOME:
• Meter R-OUT → Distribution board (Phase R loads)
• Meter Y-OUT → Distribution board (Phase Y loads)
• Meter B-OUT → Distribution board (Phase B loads)
• Meter N-OUT → Neutral bar

💡 THE METER READS:
Total kWh = kWh(R) + kWh(Y) + kWh(B)

Even if R-phase has 100 units, Y has 80, B has 70...
Your bill shows: 250 units total!

⚠️ IMPORTANT:
The meter doesn't care about balance. But YOU should balance loads to avoid:
• Overheating of one phase
• Neutral current issues
• Voltage imbalance

🎯 YOUR TASK: We don't have a 3-phase meter component yet, so just understand the concept!
(Click to continue)
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'understand_meter', label: 'Understand 3-phase meter connections' },
    ],
    validate: () => true, // Auto-pass
  },
  {
    id: 'T10',
    title: 'Load Distribution Strategy',
    description: `
⚖️ DISTRIBUTING LOADS ACROSS PHASES

This is THE MOST IMPORTANT part of home 3-phase wiring!

🎯 THE GOLDEN RULE: BALANCE YOUR LOADS!

❌ BAD DISTRIBUTION:
R Phase: Geyser (2000W) + AC (1500W) + Kitchen (1000W) = 4500W (OVERLOADED!)
Y Phase: 2 LEDs (30W) = 30W (Almost nothing)
B Phase: TV (100W) = 100W (Almost nothing)

Result: R-phase MCB trips, wire overheats, bill is high!

✅ GOOD DISTRIBUTION:
R Phase: Geyser (2000W) + Bedroom 1 lights (200W) = 2200W
Y Phase: AC-1 (1500W) + Kitchen (500W) = 2000W
B Phase: AC-2 (1500W) + Bedroom 2 (300W) = 1800W

Result: All phases balanced (~2000W each), smooth operation!

📋 ROOM-WISE DISTRIBUTION EXAMPLE:

🏠 2-BHK Flat with 3-Phase:

R PHASE (RED):
• Master Bedroom AC (1500W)
• Hall lights + fans (300W)
• Total: ~1800W

Y PHASE (YELLOW):
• Kitchen (Microwave 1200W, lights 100W)
• Bedroom 1 (lights, fan 200W)
• Total: ~1500W

B PHASE (BLUE):
• Bathroom Geyser (2000W)
• Bedroom 2 (AC 1500W)
• Total: Varies (geyser not always on)

💡 PRO TIP: Put geyser on a separate MCB with timer!

🎯 YOUR TASK: Plan which room gets which phase.
(This is planning - click to continue)
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'understand_distribution', label: 'Understand load distribution strategy' },
    ],
    validate: () => true, // Auto-pass
  },
  {
    id: 'T11',
    title: 'Building a 3-Phase Home Distribution',
    description: `
🔧 COMPLETE HOME WIRING SETUP

Let's wire a real home with 3-phase supply!

📊 THE COMPLETE FLOW:

1. Electricity Board Pole → 3-Phase Supply (R, Y, B, N, E)
2. 3-Phase Energy Meter (Measures total kWh)
3. Main Isolator (3-pole MCB - 63A)
4. Distribution Board with 3 Busbars:
   - R Phase Busbar (RED)
   - Y Phase Busbar (YELLOW)
   - B Phase Busbar (BLUE)
   - Neutral Bar (BLACK)
   - Earth Bar (GREEN)

5. Individual MCBs from Each Busbar:
   - From R Busbar: MCB-1 (16A) → Master Bedroom AC
   - From Y Busbar: MCB-2 (16A) → Kitchen circuit
   - From B Busbar: MCB-3 (25A) → Geyser
   - ... (more circuits)

🎯 YOUR TASK: Build this setup in the simulator!

STEPS:
1. Place 3-Phase Supply
2. Wire it to 3-Phase Motor (pretend it's your distribution board)
3. Check all phases are energized

(In a real setup, you'd have busbars and MCBs for each phase)
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'place_supply', label: 'Place 3-Phase Supply' },
      { id: 'place_load', label: 'Place 3-Phase Load (Distribution)' },
      { id: 'wire_all', label: 'Wire R, Y, B, E correctly' },
    ],
    validate: (components, wires) => {
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
        const load = components.find(c => c.type === COMPONENT_TYPES.LOAD_3P_BALANCED);
        if (!supply || !load) return false;

        const isConn = (t1, t2) => wires.some(w =>
            (w.from.compId === supply.id && w.from.terminalId === t1 && w.to.compId === load.id && w.to.terminalId === t2) ||
            (w.from.compId === load.id && w.from.terminalId === t2 && w.to.compId === supply.id && w.to.terminalId === t1)
        );

        return isConn('R', 'R') && isConn('Y', 'Y') && isConn('B', 'B') && isConn('E', 'E');
    }
  },
  {
    id: 'T12',
    title: '⚖️ Balanced vs Unbalanced Loads',
    description: `
⚖️ UNDERSTANDING LOAD BALANCE IN HOMES

Unlike factories (motors = perfectly balanced), homes are ALWAYS unbalanced!

🏠 REAL HOME SCENARIO:

Morning 7 AM:
R: Geyser ON (2000W), Lights OFF
Y: Kitchen Microwave ON (1200W)
B: Nothing (0W)

Total Imbalance! But that's NORMAL for homes!

📊 WHAT HAPPENS DURING IMBALANCE:

Currents:
• R Phase: 2000W ÷ 230V = 8.7A
• Y Phase: 1200W ÷ 230V = 5.2A
• B Phase: 0W ÷ 230V = 0A

Neutral Current:
• NOT zero! (unlike balanced loads)
• ~4-5A flows in neutral wire

⚠️ POTENTIAL PROBLEMS:

❌ If Neutral Wire Breaks:
• Phases with heavy load get LOW voltage (200V)
• Phases with light load get HIGH voltage (250V)
• Appliances can BURN!

❌ If One Phase Overloaded Consistently:
• That phase's wire overheats
• MCB trips frequently
• Higher electricity bill (power factor issues)

✅ HOW TO AVOID:

1. **Design Time**: Distribute loads evenly across R, Y, B
2. **Installation**: Use proper wire size for each phase
3. **Neutral**: NEVER use undersized neutral (same as phase!)
4. **Protection**: Individual MCBs for each phase circuit
5. **Monitoring**: Check which phase trips often, redistribute

💡 SMART HOME TIP:
Use smart meters to monitor per-phase consumption. Apps show:
• R Phase: 45A (Heavy!)
• Y Phase: 12A
• B Phase: 18A

Then you can move some appliances to balance!

🎯 YOUR TASK: Understand why balancing matters in homes.
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'understand_balance', label: 'Understand balanced vs unbalanced loads' },
    ],
    validate: () => true, // Auto-pass
  },
  {
    id: 'T13',
    title: '🎓 3-Phase Home Wiring Complete!',
    description: `
🎉 YOU'VE MASTERED 3-PHASE HOME WIRING!

✅ What you learned:

🏠 HOME 3-PHASE BASICS:
• Why homes need 3-phase (heavy loads > 7kW)
• What you get: R, Y, B phases + Neutral
• Each room can get a different phase

⚡ ENERGY METER:
• 3-phase meter has 8 terminals (R-IN/OUT, Y-IN/OUT, B-IN/OUT, N-IN/OUT)
• Measures total consumption from all 3 phases
• Billing = kWh(R) + kWh(Y) + kWh(B)

⚖️ LOAD DISTRIBUTION:
• Distribute loads EVENLY across R, Y, B
• Example: AC on R, Geyser on Y, Kitchen on B
• Avoid overloading one phase

🔧 WIRING SETUP:
• Supply → Meter → Main MCB → Busbars (R, Y, B, N, E)
• Individual MCBs from each busbar
• Each circuit gets one phase + neutral

⚠️ SAFETY & BALANCE:
• Homes are naturally unbalanced (appliances turn on/off)
• Neutral wire is CRITICAL (same size as phase!)
• If neutral breaks = disaster (voltage imbalance)
• Monitor phase loads, redistribute if needed

📊 REAL-WORLD EXAMPLE:

3-BHK Flat (3-Phase Supply):
• R Phase: Master Bedroom (AC + lights) = 2kW
• Y Phase: Kitchen (all appliances) = 1.5kW
• B Phase: Bedroom 2 (AC + lights) + Geyser = 2.2kW
• Total: ~5.7kW (well balanced!)

Main MCB: 40A (3-pole)
Individual MCBs:
  - R: 16A (bedroom circuit)
  - Y: 16A (kitchen circuit)
  - B: 25A (geyser + bedroom)

💡 WHEN TO CHOOSE 3-PHASE FOR YOUR HOME:

✅ Choose 3-Phase if:
• Total load > 7 kW
• Multiple ACs (2+)
• Electric geyser + ACs run together
• Electricity board offers it

❌ Stick to Single-Phase if:
• Small home (1-2 BHK)
• Total load < 5 kW
• Only 1 AC + basic appliances
• Simpler, cheaper installation

🎯 NEXT STEPS:

You now know:
• Industrial 3-phase (motors, transformers)
• Residential 3-phase (home distribution)

Want more? Try:
• Build a complete 3-BHK wiring diagram
• Calculate MCB ratings for each phase
• Learn about 3-phase EV chargers
• Explore solar inverters (3-phase)

🏆 CONGRATULATIONS! You're now a 3-Phase Expert! ⚡🏠
`,
    allowedParts: Object.values(COMPONENT_TYPES), // Allow all components
    checklist: [
      { id: 'complete', label: 'Complete 3-Phase Home Wiring Path' },
    ],
    validate: () => true, // Auto-pass - congratulations screen
  }
];
