import { COMPONENT_TYPES } from '../types';

export const LESSON_PATH = [
  {
    id: 'L0',
    title: 'Orientation',
    description: 'Welcome to the Electrical Wiring Simulator. Familiarize yourself with the interface. Blue wires are Neutral, Red are Phase, Green are Earth.',
    allowedParts: Object.values(COMPONENT_TYPES), // All allowed
    checklist: [
      { id: 'start', label: 'Explore the interface' },
    ],
    validation: () => true, // Auto-pass or just manual next
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

       // Helper to check connection
       const hasConn = (fromId, fromTerm, toId, toTerm) => {
          return wires.some(w => 
             (w.from.compId === fromId && w.from.terminalId === fromTerm && w.to.compId === toId && w.to.terminalId === toTerm) ||
             (w.from.compId === toId && w.from.terminalId === toTerm && w.to.compId === fromId && w.to.terminalId === fromTerm)
          );
       };

       return hasConn(supply.id, 'L', meter.id, 'IN_L') &&
              hasConn(supply.id, 'N', meter.id, 'IN_N');
    }
  },
  {
    id: 'L3',
    title: 'Main Switch (MCB)',
    description: 'The Main MCB isolates the Phase. Connect Meter Output Phase to the Main MCB Input.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB],
    checklist: [
      { id: 'has_mcb', label: 'Place Main MCB' },
      { id: 'conn_main', label: 'Connect Meter L-OUT → MCB IN' },
      { id: 'is_on', label: 'Switch ON the MCB' },
    ],
    validate: (components, wires) => {
       const meter = components.find(c => c.type === COMPONENT_TYPES.METER);
       // We need to distinguish Main MCB if there are multiple, but here we likely only have one or we assume the first one connected to Meter is Main.
       // Let's iterate MCBs.
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
    title: 'Distribution Board (DB)',
    description: 'Set up the DB with a Phase Busbar, Neutral Bar, and Earth Bar. Connect them appropriately.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.BUSBAR, COMPONENT_TYPES.NEUTRAL_BAR, COMPONENT_TYPES.EARTH_BAR],
    checklist: [
      { id: 'has_bars', label: 'Place Busbar, N-Bar, E-Bar' },
      { id: 'conn_bus', label: 'Connect Main MCB OUT → Busbar IN' },
      { id: 'conn_neut', label: 'Connect Meter N-OUT → Neutral Bar' },
      { id: 'conn_earth', label: 'Connect Supply E → Earth Bar' },
    ],
    validate: (components, wires) => {
       const hasType = (t) => components.some(c => c.type === t);
       if (!hasType(COMPONENT_TYPES.BUSBAR) || !hasType(COMPONENT_TYPES.NEUTRAL_BAR) || !hasType(COMPONENT_TYPES.EARTH_BAR)) return false;

       // Simplify checks: just look for ANY connection between correct types/terminals
       // This is loose validation but good for a prototype.
       const wireExists = (t1, term1, t2, term2) => wires.some(w => {
           const c1 = components.find(c => c.id === w.from.compId);
           const c2 = components.find(c => c.id === w.to.compId);
           if (!c1 || !c2) return false;
           
           // Check direction 1
           if (c1.type === t1 && w.from.terminalId === term1 && c2.type === t2 && (term2 === '*' || w.to.terminalId === term2)) return true;
           // Check direction 2
           if (c2.type === t1 && w.to.terminalId === term1 && c1.type === t2 && (term2 === '*' || w.from.terminalId === term2)) return true;
           return false;
       });
       
       // N-Bar allows any N connection usually, but here we check specific feed
       const neutralFeed = wires.some(w => {
           const c1 = components.find(c => c.id === w.from.compId);
           const c2 = components.find(c => c.id === w.to.compId);
           // Meter OUT_N to N_BAR (any)
           if (c1.type === COMPONENT_TYPES.METER && w.from.terminalId === 'OUT_N' && c2.type === COMPONENT_TYPES.NEUTRAL_BAR) return true;
           if (c2.type === COMPONENT_TYPES.METER && w.to.terminalId === 'OUT_N' && c1.type === COMPONENT_TYPES.NEUTRAL_BAR) return true;
           return false;
       });

       const earthFeed = wires.some(w => {
           const c1 = components.find(c => c.id === w.from.compId);
           const c2 = components.find(c => c.id === w.to.compId);
           // Supply E to E_BAR (any)
           if (c1.type === COMPONENT_TYPES.SUPPLY && w.from.terminalId === 'E' && c2.type === COMPONENT_TYPES.EARTH_BAR) return true;
           if (c2.type === COMPONENT_TYPES.SUPPLY && w.to.terminalId === 'E' && c1.type === COMPONENT_TYPES.EARTH_BAR) return true;
           return false;
       });

       const busFeed = wireExists(COMPONENT_TYPES.MCB, 'LOUT', COMPONENT_TYPES.BUSBAR, 'IN');

       return neutralFeed && earthFeed && busFeed;
    }
  },
  {
    id: 'L5',
    title: 'Circuit Protection',
    description: 'Add two MCBs for separate circuits (Lights and Sockets) and power them from the Busbar.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.BUSBAR, COMPONENT_TYPES.NEUTRAL_BAR, COMPONENT_TYPES.EARTH_BAR],
    checklist: [
      { id: 'has_3_mcb', label: 'Have 3 MCBs total (1 Main, 2 Circuits)' },
      { id: 'conn_c1', label: 'Connect Busbar OUT → Circuit 1 MCB' },
      { id: 'conn_c2', label: 'Connect Busbar OUT → Circuit 2 MCB' },
    ],
    validate: (components, wires) => {
        const mcbs = components.filter(c => c.type === COMPONENT_TYPES.MCB);
        if (mcbs.length < 3) return false;

        // Count MCBs fed by Busbar
        let busFedCount = 0;
        wires.forEach(w => {
            const c1 = components.find(c => c.id === w.from.compId);
            const c2 = components.find(c => c.id === w.to.compId);
            if (!c1 || !c2) return;
            
            if (c1.type === COMPONENT_TYPES.BUSBAR && c2.type === COMPONENT_TYPES.MCB && w.to.terminalId === 'LIN') busFedCount++;
            if (c2.type === COMPONENT_TYPES.BUSBAR && c1.type === COMPONENT_TYPES.MCB && w.from.terminalId === 'LIN') busFedCount++;
        });

        return busFedCount >= 2;
    }
  },
  {
    id: 'L6',
    title: 'Lighting Circuit',
    description: 'Wire a lamp controlled by a switch.',
    allowedParts: [COMPONENT_TYPES.SUPPLY, COMPONENT_TYPES.METER, COMPONENT_TYPES.MCB, COMPONENT_TYPES.BUSBAR, COMPONENT_TYPES.NEUTRAL_BAR, COMPONENT_TYPES.EARTH_BAR, COMPONENT_TYPES.SWITCH, COMPONENT_TYPES.LAMP],
    checklist: [
      { id: 'has_parts', label: 'Place Switch and Lamp' },
      { id: 'conn_L', label: 'Circuit MCB → Switch → Lamp L' },
      { id: 'conn_N', label: 'N-Bar → Lamp N' },
      { id: 'test', label: 'Turn on Switch to light the Lamp' },
    ],
    validate: () => {
        // Logic handled in lessonEngine for Lamp
        return true; 
    },
    customCheck: () => {
        return false; // Will implement in lessonEngine
    }
  },
  {
    id: 'L7',
    title: 'Socket Circuit',
    description: 'Wire a 3-pin socket.',
    allowedParts: Object.values(COMPONENT_TYPES),
    checklist: [
      { id: 'has_sock', label: 'Place Socket' },
      { id: 'conn_L', label: 'Circuit MCB → Socket L' },
      { id: 'conn_N', label: 'N-Bar → Socket N' },
      { id: 'conn_E', label: 'E-Bar → Socket E' },
      { id: 'test', label: 'Socket Indicator Green (OK)' },
    ],
    validate: () => true, // Placeholder
    customCheck: (simState, components) => {
        return components.some(c => 
            c.type === COMPONENT_TYPES.SOCKET && 
            simState.socketStates[c.id]?.status === 'LIVE_OK'
        );
    }
  }
];
