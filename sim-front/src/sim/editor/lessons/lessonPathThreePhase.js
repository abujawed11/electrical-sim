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

💡 LOOK AT THE LABEL COLORS:
• Red labels (R-I, R-O) = Red phase terminals
• Yellow labels (Y-I, Y-O) = Yellow phase terminals
• Blue labels (B-I, B-O) = Blue phase terminals

🎯 YOUR TASK: NOW WIRE IT FOR REAL!
Place a 3-Phase Energy Meter and connect the SUPPLY to the METER INPUT side.
Connect all 4 wires: R → R-I, Y → Y-I, B → B-I, N → N-I
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.METER_3P],
    checklist: [
      { id: 'place_meter', label: 'Place 3-Phase Energy Meter' },
      { id: 'conn_r', label: 'Connect Supply R → Meter IN_R' },
      { id: 'conn_y', label: 'Connect Supply Y → Meter IN_Y' },
      { id: 'conn_b', label: 'Connect Supply B → Meter IN_B' },
      { id: 'conn_n', label: 'Connect Supply N → Meter IN_N' },
    ],
    validate: (components, wires) => {
      const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
      const meter = components.find(c => c.type === COMPONENT_TYPES.METER_3P);
      if (!supply || !meter) return false;

      const isConn = (t1, t2) => wires.some(w =>
        (w.from.compId === supply.id && w.from.terminalId === t1 && w.to.compId === meter.id && w.to.terminalId === t2) ||
        (w.from.compId === meter.id && w.from.terminalId === t2 && w.to.compId === supply.id && w.to.terminalId === t1)
      );

      return isConn('R', 'IN_R') && isConn('Y', 'IN_Y') && isConn('B', 'IN_B') && isConn('N', 'IN_N');
    }
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

🎯 YOUR TASK: Wire Meter → Main MCB!

After the meter, you need a MAIN ISOLATOR (3-Pole MCB) that can switch OFF all 3 phases together for safety.

STEPS:
1. Place a 3-Pole MCB (Main MCB)
2. Wire Meter OUTPUT → MCB INPUT
   - Meter OUT_R → MCB IN_R
   - Meter OUT_Y → MCB IN_Y
   - Meter OUT_B → MCB IN_B
3. Turn ON the MCB

📋 NOTE: We're skipping neutral connection for now (neutral usually goes directly to busbar). This lesson focuses on the 3-phase lines.

This MCB is your main isolator - when you switch it OFF, the entire house loses power!
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.METER_3P, COMPONENT_TYPES.MCB_3P],
    checklist: [
      { id: 'place_mcb', label: 'Place 3-Pole MCB' },
      { id: 'conn_r', label: 'Connect Meter OUT_R → MCB IN_R' },
      { id: 'conn_y', label: 'Connect Meter OUT_Y → MCB IN_Y' },
      { id: 'conn_b', label: 'Connect Meter OUT_B → MCB IN_B' },
      { id: 'switch_on', label: 'Turn ON the MCB' },
    ],
    validate: (components, wires) => {
        const meter = components.find(c => c.type === COMPONENT_TYPES.METER_3P);
        const mcb = components.find(c => c.type === COMPONENT_TYPES.MCB_3P);
        if (!meter || !mcb) return false;

        const isConn = (t1, t2) => wires.some(w =>
            (w.from.compId === meter.id && w.from.terminalId === t1 && w.to.compId === mcb.id && w.to.terminalId === t2) ||
            (w.from.compId === mcb.id && w.from.terminalId === t2 && w.to.compId === meter.id && w.to.terminalId === t1)
        );

        return isConn('OUT_R', 'IN_R') && isConn('OUT_Y', 'IN_Y') && isConn('OUT_B', 'IN_B') && mcb.properties.isOn;
    }
  },
  {
    id: 'T11A',
    title: 'Phase Distribution with Busbars',
    description: `
🏗️ CREATING THE DISTRIBUTION BOARD

Now we need to DISTRIBUTE each phase to different circuits (rooms) in your home!

📊 WHAT ARE PHASE BUSBARS?

Just like single-phase homes use ONE busbar for phase, 3-phase homes use THREE separate busbars:
• R Phase Busbar (RED) - For R-phase circuits
• Y Phase Busbar (YELLOW) - For Y-phase circuits
• B Phase Busbar (BLUE) - For B-phase circuits

Plus the usual:
• Neutral Bar (for all neutral returns)
• Earth Bar (for all earth wires)

🔌 CONNECTION:

From Main MCB OUT → To Phase Busbars:
• MCB OUT_R → R Phase Busbar
• MCB OUT_Y → Y Phase Busbar
• MCB OUT_B → B Phase Busbar

Later, you'll connect individual MCBs to each busbar for different rooms!

🎯 YOUR TASK: Add Phase Busbars!

Place all 3 phase busbars and connect the Main MCB output to them.
Wire: MCB OUT_R → R Busbar IN, MCB OUT_Y → Y Busbar IN, MCB OUT_B → B Busbar IN

This creates your distribution point where all phase loads will connect!
`,
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.METER_3P, COMPONENT_TYPES.MCB_3P, COMPONENT_TYPES.BUSBAR_R, COMPONENT_TYPES.BUSBAR_Y, COMPONENT_TYPES.BUSBAR_B],
    checklist: [
      { id: 'place_r_busbar', label: 'Place R Phase Busbar' },
      { id: 'place_y_busbar', label: 'Place Y Phase Busbar' },
      { id: 'place_b_busbar', label: 'Place B Phase Busbar' },
      { id: 'conn_r', label: 'Connect MCB OUT_R → R Busbar' },
      { id: 'conn_y', label: 'Connect MCB OUT_Y → Y Busbar' },
      { id: 'conn_b', label: 'Connect MCB OUT_B → B Busbar' },
    ],
    validate: (components, wires) => {
        const mcb = components.find(c => c.type === COMPONENT_TYPES.MCB_3P);
        const busbarR = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_R);
        const busbarY = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_Y);
        const busbarB = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_B);

        if (!mcb || !busbarR || !busbarY || !busbarB) return false;

        const isConn = (compId, termId, busbarId) => wires.some(w =>
            (w.from.compId === compId && w.from.terminalId === termId && w.to.compId === busbarId) ||
            (w.from.compId === busbarId && w.to.compId === compId && w.to.terminalId === termId)
        );

        // Check MCB outputs are connected to respective busbars (any terminal on busbar)
        const hasRConnection = wires.some(w =>
            (w.from.compId === mcb.id && w.from.terminalId === 'OUT_R' && w.to.compId === busbarR.id) ||
            (w.to.compId === mcb.id && w.to.terminalId === 'OUT_R' && w.from.compId === busbarR.id)
        );
        const hasYConnection = wires.some(w =>
            (w.from.compId === mcb.id && w.from.terminalId === 'OUT_Y' && w.to.compId === busbarY.id) ||
            (w.to.compId === mcb.id && w.to.terminalId === 'OUT_Y' && w.from.compId === busbarY.id)
        );
        const hasBConnection = wires.some(w =>
            (w.from.compId === mcb.id && w.from.terminalId === 'OUT_B' && w.to.compId === busbarB.id) ||
            (w.to.compId === mcb.id && w.to.terminalId === 'OUT_B' && w.from.compId === busbarB.id)
        );

        return hasRConnection && hasYConnection && hasBConnection;
    }
  },
  {
    id: 'T11B',
    title: '🔌 Individual Room MCBs',
    description: `
🔌 PROTECTING INDIVIDUAL CIRCUITS

Now that you have phase busbars (R, Y, B), you need individual MCBs for each room/circuit.

🏠 TYPICAL HOME DISTRIBUTION:

Each room gets:
• One phase (R or Y or B)
• Common neutral
• Common earth
• Individual MCB for protection

📋 EXAMPLE 3-BHK LAYOUT:

R Phase:
• Master Bedroom (AC 1.5 Ton = 2kW) → 16A MCB
• Living Room (Lights + TV = 500W) → 6A MCB

Y Phase:
• Kitchen (All appliances = 3kW) → 20A MCB
• Bedroom 2 (AC 1 Ton = 1.5kW) → 10A MCB

B Phase:
• Geyser (2kW) → 16A MCB
• Bedroom 3 (AC + Lights = 2kW) → 16A MCB

🎯 MCB SIZING FORMULA:

Current = Power ÷ Voltage
Current = Watts ÷ 230V

Examples:
• 2000W geyser: 2000÷230 = 8.7A → Use **16A MCB**
• 1500W AC: 1500÷230 = 6.5A → Use **10A MCB**
• 500W lights: 500÷230 = 2.2A → Use **6A MCB**

💡 RULE: Always use next higher standard MCB rating!
Standard sizes: 6A, 10A, 16A, 20A, 25A, 32A, 40A

⚠️ WHY INDIVIDUAL MCBs?

1. **Safety**: Fault in one room doesn't trip whole house
2. **Convenience**: Can isolate circuits for maintenance
3. **Code Compliance**: Required by electrical regulations
4. **Easy Troubleshooting**: Know which circuit has issues

🎯 YOUR TASK: Place individual MCBs from each phase busbar

Let's add MCBs for two rooms:
• 1 MCB from R busbar (Master bedroom circuit)
• 1 MCB from Y busbar (Kitchen circuit)
• 1 MCB from B busbar (Geyser circuit)
`,
    allowedParts: [
        COMPONENT_TYPES.SUPPLY_3P,
        COMPONENT_TYPES.METER_3P,
        COMPONENT_TYPES.MCB_3P,
        COMPONENT_TYPES.BUSBAR_R,
        COMPONENT_TYPES.BUSBAR_Y,
        COMPONENT_TYPES.BUSBAR_B,
        COMPONENT_TYPES.MCB,
        COMPONENT_TYPES.NEUTRAL_BAR,
        COMPONENT_TYPES.EARTH_BAR
    ],
    checklist: [
      { id: 'place_mcb_r', label: 'Place MCB for R phase circuit' },
      { id: 'place_mcb_y', label: 'Place MCB for Y phase circuit' },
      { id: 'place_mcb_b', label: 'Place MCB for B phase circuit' },
      { id: 'connect_r', label: 'Connect R busbar to MCB_R input (LIN)' },
      { id: 'connect_y', label: 'Connect Y busbar to MCB_Y input (LIN)' },
      { id: 'connect_b', label: 'Connect B busbar to MCB_B input (LIN)' },
    ],
    validate: (components, wires) => {
        const busbarR = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_R);
        const busbarY = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_Y);
        const busbarB = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_B);
        const mcbs = components.filter(c => c.type === COMPONENT_TYPES.MCB);

        if (!busbarR || !busbarY || !busbarB || mcbs.length < 3) return false;

        // Check if at least one MCB is connected to each busbar
        const hasMcbOnR = mcbs.some(mcb =>
            wires.some(w =>
                (w.from.compId === busbarR.id && w.to.compId === mcb.id && w.to.terminalId === 'LIN') ||
                (w.to.compId === busbarR.id && w.from.compId === mcb.id && w.from.terminalId === 'LIN')
            )
        );

        const hasMcbOnY = mcbs.some(mcb =>
            wires.some(w =>
                (w.from.compId === busbarY.id && w.to.compId === mcb.id && w.to.terminalId === 'LIN') ||
                (w.to.compId === busbarY.id && w.from.compId === mcb.id && w.from.terminalId === 'LIN')
            )
        );

        const hasMcbOnB = mcbs.some(mcb =>
            wires.some(w =>
                (w.from.compId === busbarB.id && w.to.compId === mcb.id && w.to.terminalId === 'LIN') ||
                (w.to.compId === busbarB.id && w.from.compId === mcb.id && w.from.terminalId === 'LIN')
            )
        );

        return hasMcbOnR && hasMcbOnY && hasMcbOnB;
    }
  },
  {
    id: 'T11C',
    title: '🛏️ Wiring Your First Room',
    description: `
🛏️ LET'S WIRE A COMPLETE BEDROOM!

Now you'll wire a complete room circuit with actual loads!

📋 BEDROOM CIRCUIT COMPONENTS:

From MCB output:
• Phase (R) → Goes to all appliances
• Neutral Bar → Common neutral for all
• Earth Bar → Safety ground for all

Bedroom Loads:
• 1.5 Ton AC (2000W) ⚡
• Ceiling Fan (75W) 💨
• LED Lights (40W) 💡

All loads need:
• Live (L) from phase
• Neutral (N) from neutral bar
• (Earth usually assumed in real wiring)

🔌 WIRING STEPS:

Step 1: Connect Neutral Bar
• From Meter OUT_N → Neutral Bar

Step 2: Wire MCB Output to Loads
• MCB LOUT (R phase) → AC "L" terminal
• MCB LOUT → Fan "L" terminal
• MCB LOUT → Lamp "L" terminal

Step 3: Wire Neutral to Loads
• Neutral Bar → AC "N" terminal
• Neutral Bar → Fan "N" terminal
• Neutral Bar → Lamp "N" terminal

⚡ WHAT HAPPENS:

When MCB is ON:
✅ R phase flows through MCB to all appliances
✅ Neutral completes the circuit
✅ AC draws ~8.7A, Fan draws ~0.3A, Lamp draws ~0.2A
✅ Total: ~9.2A (safe for 16A MCB!)

If Overload (e.g. short circuit):
❌ Current exceeds 16A
❌ MCB trips instantly
❌ Only bedroom circuit goes off (others still work!)

🎯 YOUR TASK: Wire a complete bedroom from R phase

Add these components and wire them:
• 1 AC (from MCB on R phase)
• 1 FAN (from same MCB)
• 1 LAMP (from same MCB)
• All neutrals from neutral bar
`,
    allowedParts: [
        COMPONENT_TYPES.SUPPLY_3P,
        COMPONENT_TYPES.METER_3P,
        COMPONENT_TYPES.MCB_3P,
        COMPONENT_TYPES.BUSBAR_R,
        COMPONENT_TYPES.BUSBAR_Y,
        COMPONENT_TYPES.BUSBAR_B,
        COMPONENT_TYPES.MCB,
        COMPONENT_TYPES.NEUTRAL_BAR,
        COMPONENT_TYPES.EARTH_BAR,
        COMPONENT_TYPES.AC,
        COMPONENT_TYPES.FAN,
        COMPONENT_TYPES.LAMP
    ],
    checklist: [
      { id: 'neutral_bar', label: 'Place Neutral Bar and connect to Meter OUT_N' },
      { id: 'place_ac', label: 'Place AC unit' },
      { id: 'place_fan', label: 'Place Ceiling Fan' },
      { id: 'place_lamp', label: 'Place Lamp/Lights' },
      { id: 'wire_ac_l', label: 'Connect MCB output to AC Live terminal' },
      { id: 'wire_ac_n', label: 'Connect Neutral Bar to AC Neutral terminal' },
      { id: 'wire_fan_l', label: 'Connect MCB output to Fan Live terminal' },
      { id: 'wire_fan_n', label: 'Connect Neutral Bar to Fan Neutral terminal' },
      { id: 'wire_lamp_l', label: 'Connect MCB output to Lamp Live terminal' },
      { id: 'wire_lamp_n', label: 'Connect Neutral Bar to Lamp Neutral terminal' },
    ],
    validate: (components, wires) => {
        const meter = components.find(c => c.type === COMPONENT_TYPES.METER_3P);
        const neutralBar = components.find(c => c.type === COMPONENT_TYPES.NEUTRAL_BAR);
        const ac = components.find(c => c.type === COMPONENT_TYPES.AC);
        const fan = components.find(c => c.type === COMPONENT_TYPES.FAN);
        const lamp = components.find(c => c.type === COMPONENT_TYPES.LAMP);
        const mcbs = components.filter(c => c.type === COMPONENT_TYPES.MCB);

        if (!meter || !neutralBar || !ac || !fan || !lamp || mcbs.length === 0) return false;

        // Check neutral bar connected to meter
        const neutralBarConnected = wires.some(w =>
            (w.from.compId === meter.id && w.from.terminalId === 'OUT_N' && w.to.compId === neutralBar.id) ||
            (w.to.compId === meter.id && w.to.terminalId === 'OUT_N' && w.from.compId === neutralBar.id)
        );

        // Check if loads have both L and N connections
        const checkLoad = (loadId) => {
            const hasLive = mcbs.some(mcb =>
                wires.some(w =>
                    (w.from.compId === mcb.id && w.from.terminalId === 'LOUT' && w.to.compId === loadId && w.to.terminalId === 'L') ||
                    (w.to.compId === mcb.id && w.to.terminalId === 'LOUT' && w.from.compId === loadId && w.from.terminalId === 'L')
                )
            );

            const hasNeutral = wires.some(w =>
                (w.from.compId === neutralBar.id && w.to.compId === loadId && w.to.terminalId === 'N') ||
                (w.to.compId === neutralBar.id && w.from.compId === loadId && w.from.terminalId === 'N')
            );

            return hasLive && hasNeutral;
        };

        return neutralBarConnected && checkLoad(ac.id) && checkLoad(fan.id) && checkLoad(lamp.id);
    }
  },
  {
    id: 'T11D',
    title: '🏠 Complete 3-BHK Home Wiring',
    description: `
🏠 FINAL CHALLENGE: WIRE A COMPLETE 3-BHK HOME!

Now put everything together! Wire a full 3-bedroom home with balanced load distribution.

📋 HOME SPECIFICATION:

🔴 R PHASE (Red Busbar):
• Master Bedroom AC (2000W) - 16A MCB
• Living Room Lights (100W) - 6A MCB

🟡 Y PHASE (Yellow Busbar):
• Kitchen Appliances:
  - Geyser (2000W) - 20A MCB
  - Lights (50W)

🔵 B PHASE (Blue Busbar):
• Bedroom 2 AC (1500W) - 10A MCB
• Bedroom 3 Fan + Lights (125W) - 6A MCB

📊 LOAD ANALYSIS:

Total Load per Phase:
• R: 2100W (2.1kW) → ~9.1A
• Y: 2050W (2.05kW) → ~8.9A
• B: 1625W (1.625kW) → ~7.1A

✅ Fairly Balanced! (Good design)
✅ Total: 5.775kW (manageable for 3-phase)
✅ No single phase overloaded

🎯 YOUR TASK: Build the complete home!

You need to place and wire:

PROTECTION:
• 3-Phase Supply ⚡
• 3-Phase Energy Meter 📊
• Main 3-Pole MCB (40A) 🔒
• Phase Busbars (R, Y, B) 🔴🟡🔵
• Neutral Bar (N) ⚪
• Individual MCBs (at least 6 for different circuits) 🔌

LOADS:
• 2× AC units (Master BR, Bedroom 2)
• 1× Geyser (Kitchen)
• 2× Lamps (Living room, Kitchen)
• 1× Fan (Bedroom 3)

WIRING:
✅ Supply → Meter (all 4 wires: R, Y, B, N)
✅ Meter → Main MCB (R, Y, B)
✅ Main MCB → Phase Busbars (R→R, Y→Y, B→B)
✅ Meter Neutral → Neutral Bar
✅ Individual MCBs from each busbar
✅ Loads properly distributed and connected

💡 TIPS:

1. Start with the main supply chain (Supply → Meter → MCB → Busbars)
2. Add neutral bar from meter
3. Place individual MCBs on each busbar
4. Add loads and wire them (L from MCB, N from neutral bar)
5. Turn ON all MCBs to verify energization!

⚠️ COMMON MISTAKES TO AVOID:

❌ Putting all heavy loads on one phase (imbalanced!)
❌ Forgetting neutral connections (loads won't work!)
❌ Wrong MCB rating (6A for 2000W geyser = trips!)
❌ Not switching MCBs ON (loads stay off!)

🎯 When done correctly:
✅ All colored terminals glow with phase colors
✅ Loads show power consumption in properties
✅ System is balanced and safe
✅ You're a certified home electrician! 🎓⚡

Go ahead and wire your home! Take your time, this is the real deal! 💪
`,
    allowedParts: Object.values(COMPONENT_TYPES), // Allow everything!
    checklist: [
      { id: 'supply_meter', label: 'Connect Supply to Meter (R,Y,B,N)' },
      { id: 'meter_mcb', label: 'Connect Meter to Main MCB (R,Y,B)' },
      { id: 'mcb_busbars', label: 'Connect Main MCB to Phase Busbars' },
      { id: 'neutral_bar', label: 'Connect Neutral Bar to Meter' },
      { id: 'mcbs_placed', label: 'Place at least 6 individual MCBs' },
      { id: 'r_loads', label: 'Wire R phase loads (AC + Lamp)' },
      { id: 'y_loads', label: 'Wire Y phase loads (Geyser + Lamp)' },
      { id: 'b_loads', label: 'Wire B phase loads (AC + Fan)' },
      { id: 'all_on', label: 'Turn ON all MCBs and verify energization' },
    ],
    validate: (components, wires) => {
        // Check all major components exist
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
        const meter = components.find(c => c.type === COMPONENT_TYPES.METER_3P);
        const mainMCB = components.find(c => c.type === COMPONENT_TYPES.MCB_3P);
        const busbarR = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_R);
        const busbarY = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_Y);
        const busbarB = components.find(c => c.type === COMPONENT_TYPES.BUSBAR_B);
        const neutralBar = components.find(c => c.type === COMPONENT_TYPES.NEUTRAL_BAR);

        const mcbs = components.filter(c => c.type === COMPONENT_TYPES.MCB);
        const acs = components.filter(c => c.type === COMPONENT_TYPES.AC);
        const geysers = components.filter(c => c.type === COMPONENT_TYPES.GEYSER);
        const lamps = components.filter(c => c.type === COMPONENT_TYPES.LAMP);
        const fans = components.filter(c => c.type === COMPONENT_TYPES.FAN);

        // Basic component check
        if (!supply || !meter || !mainMCB || !busbarR || !busbarY || !busbarB || !neutralBar) return false;
        if (mcbs.length < 6) return false;
        if (acs.length < 2 || geysers.length < 1 || lamps.length < 2 || fans.length < 1) return false;

        // Helper to check connection
        const isConnected = (comp1Id, term1, comp2Id, term2) => {
            return wires.some(w =>
                (w.from.compId === comp1Id && w.from.terminalId === term1 && w.to.compId === comp2Id && w.to.terminalId === term2) ||
                (w.to.compId === comp1Id && w.to.terminalId === term1 && w.from.compId === comp2Id && w.from.terminalId === term2)
            );
        };

        // Check main supply chain connections
        const supplyToMeter =
            isConnected(supply.id, 'R', meter.id, 'IN_R') &&
            isConnected(supply.id, 'Y', meter.id, 'IN_Y') &&
            isConnected(supply.id, 'B', meter.id, 'IN_B') &&
            isConnected(supply.id, 'N', meter.id, 'IN_N');

        const meterToMCB =
            isConnected(meter.id, 'OUT_R', mainMCB.id, 'IN_R') &&
            isConnected(meter.id, 'OUT_Y', mainMCB.id, 'IN_Y') &&
            isConnected(meter.id, 'OUT_B', mainMCB.id, 'IN_B');

        const mcbToBusbars =
            isConnected(mainMCB.id, 'OUT_R', busbarR.id, 'IN') &&
            isConnected(mainMCB.id, 'OUT_Y', busbarY.id, 'IN') &&
            isConnected(mainMCB.id, 'OUT_B', busbarB.id, 'IN');

        const neutralConnected = isConnected(meter.id, 'OUT_N', neutralBar.id, 'IN');

        // Check if at least some loads are properly wired (at least 3 loads with both L and N)
        const loads = [...acs, ...geysers, ...lamps, ...fans];
        let properlyWiredLoads = 0;

        loads.forEach(load => {
            const hasLive = mcbs.some(mcb =>
                wires.some(w =>
                    (w.from.compId === mcb.id && w.from.terminalId === 'LOUT' && w.to.compId === load.id && w.to.terminalId === 'L') ||
                    (w.to.compId === mcb.id && w.to.terminalId === 'LOUT' && w.from.compId === load.id && w.from.terminalId === 'L')
                )
            );

            const hasNeutral = wires.some(w =>
                (w.from.compId === neutralBar.id && w.to.compId === load.id && w.to.terminalId === 'N') ||
                (w.to.compId === neutralBar.id && w.from.compId === load.id && w.from.terminalId === 'N')
            );

            if (hasLive && hasNeutral) properlyWiredLoads++;
        });

        // Check if main MCB is ON
        const mainMCBOn = mainMCB.properties?.isOn === true;

        return supplyToMeter && meterToMCB && mcbToBusbars && neutralConnected &&
               properlyWiredLoads >= 5 && mainMCBOn;
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
