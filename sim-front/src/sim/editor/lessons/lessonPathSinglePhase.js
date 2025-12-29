import { COMPONENT_TYPES } from '../types';

export const LESSON_PATH = [
  {
    id: 'L0',
    title: 'Orientation',
    description: 'Welcome to the Electrical Wiring Simulator. Familiarize yourself with the interface. Blue wires are Neutral, Red are Phase, Green are Earth.',
    allowedParts: Object.values(COMPONENT_TYPES), 
    checklist: [
      { id: 'start', label: 'Explore the interface' },
    ],
    validate: () => true,
  },
  {
    id: 'L1',
    title: 'Add Mains Supply',
    description: 'Every house needs a power source. Add a "Mains Supply" from the toolbox.',
    allowedParts: [COMPONENT_TYPES.SUPPLY],
    checklist: [
      { id: 'has_supply', label: 'Place Mains Supply' },
    ],
    validate: (components) => {
       return components.some(c => c.type === COMPONENT_TYPES.SUPPLY);
    }
  },
  {
    id: 'L2',
    title: 'Energy Meter',
    description: 'The Energy Meter measures consumption. Connect the Supply Phase (L) and Neutral (N) to the Meter inputs.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER],
    checklist: [
      { id: 'has_meter', label: 'Place Energy Meter' },
      { id: 'conn_L', label: 'Connect Supply L → Meter L-IN' },
      { id: 'conn_N', label: 'Connect Supply N → Meter N-IN' },
    ],
    validate: (components, wires) => {
       const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY);
       const meter = components.find(c => c.type === COMPONENT_TYPES.METER);
       if (!supply || !meter) return false;
       const hasConn = (fromId, fromTerm, toId, toTerm) => {
          return wires.some(w => 
             (w.from.compId === fromId && w.from.terminalId === fromTerm && w.to.compId === toId && w.to.terminalId === toTerm) ||
             (w.from.compId === toId && w.from.terminalId === toTerm && w.to.compId === fromId && w.to.terminalId === fromTerm)
          );
       };
       return hasConn(supply.id, 'L', meter.id, 'IN_L') && hasConn(supply.id, 'N', meter.id, 'IN_N');
    }
  },
  {
    id: 'L3',
    title: 'Main Isolator (MCB)',
    description: 'The Main Switch isolates the house. Connect Meter Output Phase to the Main MCB Input.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB],
    checklist: [
      { id: 'has_mcb', label: 'Place Main MCB' },
      { id: 'conn_main', label: 'Connect Meter L-OUT → MCB IN' },
      { id: 'is_on', label: 'Switch ON the MCB' },
    ],
    validate: (components, wires) => {
       const meter = components.find(c => c.type === COMPONENT_TYPES.METER);
       const mcbs = components.filter(c => c.type === COMPONENT_TYPES.MCB);
       if (!meter || mcbs.length === 0) return false;
       const connectedMCB = mcbs.find(mcb => 
          wires.some(w => 
             (w.from.compId === meter.id && w.from.terminalId === 'OUT_L' && w.to.compId === mcb.id && w.to.terminalId === 'LIN') ||
             (w.from.compId === mcb.id && w.from.terminalId === 'LIN' && w.to.compId === meter.id && w.to.terminalId === 'OUT_L')
          )
       );
       return !!connectedMCB && connectedMCB.properties.isOn;
    }
  },
  {
    id: 'L4',
    title: 'Earth Leakage Protection (RCCB)',
    description: 'Add an RCCB to protect against shocks. Connect Main MCB OUT to RCCB L-IN, and Meter N-OUT to RCCB N-IN.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.RCCB],
    checklist: [
      { id: 'has_rccb', label: 'Place RCCB' },
      { id: 'conn_ph', label: 'Main MCB L-OUT → RCCB L-IN' },
      { id: 'conn_neu', label: 'Meter N-OUT → RCCB N-IN' },
      { id: 'on', label: 'Switch RCCB ON' },
    ],
    validate: (components, wires) => {
        const rccb = components.find(c => c.type === COMPONENT_TYPES.RCCB);
        if (!rccb || !rccb.properties.isOn) return false;
        const phaseOk = wires.some(w => 
            (w.to.compId === rccb.id && w.to.terminalId === 'L_IN' && components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.MCB) ||
            (w.from.compId === rccb.id && w.from.terminalId === 'L_IN' && components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.MCB)
        );
        const neutralOk = wires.some(w => 
            (w.to.compId === rccb.id && w.to.terminalId === 'N_IN' && components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.METER) ||
            (w.from.compId === rccb.id && w.from.terminalId === 'N_IN' && components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.METER)
        );
        return phaseOk && neutralOk;
    }
  },
  {
    id: 'L5',
    title: 'Distribution Busbars',
    description: 'Connect the RCCB Outputs to the Busbar and Neutral Bar. Connect Supply Earth to Earth Bar.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.RCCB, COMPONENT_TYPES.BUSBAR, COMPONENT_TYPES.NEUTRAL_BAR, COMPONENT_TYPES.EARTH_BAR],
    checklist: [
      { id: 'conn_bus', label: 'RCCB L-OUT → Busbar IN' },
      { id: 'conn_neut', label: 'RCCB N-OUT → Neutral Bar' },
      { id: 'conn_earth', label: 'Supply E → Earth Bar' },
    ],
    validate: (components, wires) => {
       const rccb = components.find(c => c.type === COMPONENT_TYPES.RCCB);
       if (!rccb) return false;
       const busFeed = wires.some(w => 
           (w.from.compId === rccb.id && w.from.terminalId === 'L_OUT' && components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.BUSBAR) ||
           (w.to.compId === rccb.id && w.to.terminalId === 'L_OUT' && components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.BUSBAR)
       );
       const neutFeed = wires.some(w => 
           (w.from.compId === rccb.id && w.from.terminalId === 'N_OUT' && components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.NEUTRAL_BAR) ||
           (w.to.compId === rccb.id && w.to.terminalId === 'N_OUT' && components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.NEUTRAL_BAR)
       );
       const earthFeed = wires.some(w => 
            components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.SUPPLY && 
            components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.EARTH_BAR
       ) || wires.some(w => 
            components.find(c => c.id === w.to.compId)?.type === COMPONENT_TYPES.SUPPLY && 
            components.find(c => c.id === w.from.compId)?.type === COMPONENT_TYPES.EARTH_BAR
       );
       return busFeed && neutFeed && earthFeed;
    }
  },
  {
    id: 'L6',
    title: 'Circuit Protection (MCBs)',
    description: 'Add circuit MCBs powered from the Busbar.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.RCCB, COMPONENT_TYPES.BUSBAR, COMPONENT_TYPES.NEUTRAL_BAR, COMPONENT_TYPES.EARTH_BAR],
    checklist: [
      { id: 'has_circ_mcb', label: 'Place Circuit MCB' },
      { id: 'conn_c1', label: 'Busbar OUT → Circuit MCB IN' },
    ],
    validate: (components, wires) => {
        const busbar = components.find(c => c.type === COMPONENT_TYPES.BUSBAR);
        if (!busbar) return false;
        const connectedMCB = components.find(c => c.type === COMPONENT_TYPES.MCB && 
            wires.some(w => 
                (w.from.compId === busbar.id && w.to.compId === c.id) ||
                (w.to.compId === busbar.id && w.from.compId === c.id)
            )
        );
        return !!connectedMCB;
    }
  },
  {
    id: 'L7',
    title: 'Socket Circuit',
    description: 'Wire a socket. Ensure Neutral comes from the N-Bar (Protected), not directly from Meter or Supply.',
    allowedParts: Object.values(COMPONENT_TYPES),
    checklist: [
      { id: 'has_sock', label: 'Place Socket' },
      { id: 'conn_L', label: 'Circuit MCB → Socket L' },
      { id: 'conn_N', label: 'N-Bar → Socket N' },
      { id: 'conn_E', label: 'E-Bar → Socket E' },
      { id: 'safe', label: 'Status: LIVE_OK (No Bypass)' },
    ],
    validate: () => true, 
    customCheck: (simState, components) => {
        return components.some(c => 
            c.type === COMPONENT_TYPES.SOCKET && 
            simState.socketStates[c.id]?.status === 'LIVE_OK' &&
            !simState.socketStates[c.id]?.warning 
        );
    }
  },
  {
    id: 'L8',
    title: 'Short Circuit Fault',
    description: 'Learn how MCBs protect against Short Circuits. Add a "Short L-N" fault component downstream of the Circuit MCB.',
    allowedParts: Object.values(COMPONENT_TYPES),
    checklist: [
        { id: 'add_short', label: 'Place "Short L-N" Fault' },
        { id: 'conn_fault', label: 'Connect MCB LOUT -> Short L, N-Bar -> Short N' },
        { id: 'trip', label: 'Observe MCB Trip (Safety)' },
    ],
    validate: () => true,
    customCheck: (simState, components) => {
        // Check if a circuit MCB has tripped due to short
        // Ideally we check if it is the one connected to the fault.
        // Just checking if ANY MCB is tripped is mostly enough for learning.
        return components.some(c => 
            c.type === COMPONENT_TYPES.MCB && 
            c.properties.isTripped && 
            !c.properties.isOn // Tripped means OFF
        );
    }
  },
  {
    id: 'L9',
    title: 'Earth Leakage Fault',
    description: 'Learn how RCCBs protect against Leakage. Add a "Leak L-E" fault component downstream.',
    allowedParts: Object.values(COMPONENT_TYPES),
    checklist: [
        { id: 'add_leak', label: 'Place "Leak L-E" Fault' },
        { id: 'conn_leak', label: 'Connect MCB LOUT -> Leak L, E-Bar -> Leak E' },
        { id: 'trip_rccb', label: 'Observe RCCB Trip (Safety)' },
    ],
    validate: () => true,
    customCheck: (simState, components) => {
        return components.some(c => 
            c.type === COMPONENT_TYPES.RCCB && 
            c.properties.isTripped
        );
    }
  },
  {
    id: 'L10',
    title: 'Inverter Backup Wiring',
    description: 'Install an Inverter and Changeover Switch. Wire Mains to Inverter Input and Changeover "Mains" (A). Wire Inverter Output to Changeover "Inverter" (B). Connect Changeover Output to a Load. Verify backup power by turning Mains OFF.',
    allowedParts: Object.values(COMPONENT_TYPES),
    checklist: [
      { id: 'parts', label: 'Place Inverter & Changeover Switch' },
      { id: 'wire_inv_in', label: 'Wire Mains → Inverter AC_IN' },
      { id: 'wire_chg_a', label: 'Wire Mains → Changeover A' },
      { id: 'wire_chg_b', label: 'Wire Inverter AC_OUT → Changeover B' },
      { id: 'wire_load', label: 'Wire Changeover OUT → Load' },
      { id: 'test', label: 'Turn MAINS OFF, Switch to INVERTER, Verify Load ON' },
    ],
    validate: () => true,
    customCheck: (simState, components) => {
        // Check if Mains Supply is OFF
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY);
        if (!supply || supply.properties.enabled) return false;

        // Check if Inverter is ON
        const inverter = components.find(c => c.type === COMPONENT_TYPES.INVERTER);
        if (!inverter || !inverter.properties.enabled) return false;

        // Check if Changeover is on INVERTER
        const changeover = components.find(c => c.type === COMPONENT_TYPES.CHANGEOVER);
        if (!changeover || changeover.properties.position !== 'INVERTER') return false;

        // Check if any Load is Powered
        const anyLoadPowered = Object.values(simState.loadData).some(l => l.isPowered);
        
        return anyLoadPowered;
    }
  }
];
