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
    title: '🎓 Congratulations - 3-Phase Basics Complete!',
    description: `
🎉 YOU'VE MASTERED 3-PHASE BASICS!

✅ What you learned:
• What is 3-phase power (3 people pushing a car!)
• Phase voltage vs Line voltage (230V vs 415V)
• How to connect a 3-phase motor (R-R, Y-Y, B-B)
• What transformers do (voltage up/down)
• How to wire transformer primary & secondary
• Dangers of single-phasing (motor killer!)

📊 QUICK RECAP:

🔌 3-Phase Power:
• 3 phases: R, Y, B (120° apart)
• Constant power (unlike single-phase)
• Used in motors, factories, industries

⚡ Voltages:
• Phase Voltage (Vph) = 230V (R-to-N)
• Line Voltage (VL) = 415V (R-to-Y)
• Formula: VL = √3 × Vph = 1.732 × 230V

🔧 Connections:
• Motor: Connect R-R, Y-Y, B-B
• Transformer: HV side (11kV) → LV side (415V)
• Always connect Earth for safety!

⚠️ Safety:
• NEVER work on live HV equipment
• Single-phasing burns motors
• Always install protection relays

🎯 NEXT STEPS:

Want to learn more? Check out:
• Advanced 3-phase lessons (coming soon!)
• Transformer connections (Star, Delta)
• Motor starting methods
• Protection systems

🎓 PRACTICE TIME:
Try building a complete factory setup:
1. 3-Phase Supply (11kV)
2. Transformer (11kV → 415V)
3. Multiple motors on secondary
4. Protection devices (MCBs, relays)

You're now ready for industrial electrical systems! ⚡🏭
`,
    allowedParts: Object.values(COMPONENT_TYPES), // Allow all components
    checklist: [
      { id: 'complete', label: 'Complete 3-Phase Basics Path' },
    ],
    validate: () => true, // Auto-pass - congratulations screen
  }
];
