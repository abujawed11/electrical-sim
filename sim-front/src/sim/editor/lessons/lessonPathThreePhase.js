import { COMPONENT_TYPES } from '../types';

export const LESSON_PATH_THREE_PHASE = [
  {
    id: 'T1',
    title: '3-Phase Basics: The Supply',
    description: 'Understand the 3-Phase 4-Wire system. Identify Red (R), Yellow (Y), Blue (B) phases and Neutral (N). Connect a 3-Phase Supply.',
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P],
    checklist: [
      { id: 'place_supply', label: 'Place 3-Phase Supply' },
    ],
    validate: (components) => components.some(c => c.type === COMPONENT_TYPES.SUPPLY_3P),
  },
  {
    id: 'T2',
    title: 'Connecting a 3-Phase Load',
    description: 'Motors are common 3-phase loads. Connect a 3-Phase Load to the supply (R-R, Y-Y, B-B). Earth is safety.',
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'place_load', label: 'Place 3-Phase Load' },
      { id: 'conn_phases', label: 'Connect R, Y, B phases' },
      { id: 'conn_earth', label: 'Connect Earth' },
    ],
    validate: (components, wires) => {
        const supply = components.find(c => c.type === COMPONENT_TYPES.SUPPLY_3P);
        const load = components.find(c => c.type === COMPONENT_TYPES.LOAD_3P_BALANCED);
        if (!supply || !load) return false;
        
        // Helper to check connection
        const isConn = (t1, t2) => wires.some(w => 
            (w.from.compId === supply.id && w.from.terminalId === t1 && w.to.compId === load.id && w.to.terminalId === t2) ||
            (w.from.compId === load.id && w.from.terminalId === t2 && w.to.compId === supply.id && w.to.terminalId === t1)
        );

        return isConn('R', 'R') && isConn('Y', 'Y') && isConn('B', 'B') && isConn('E', 'E');
    }
  },
  {
    id: 'T3',
    title: 'Transformers: Delta-Star',
    description: 'Transformers step down voltage. A Delta-Star (Dyn11) connection creates a Neutral point on the secondary side. Connect High Voltage (HV) to Primary.',
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.TRANSFORMER_3P],
    checklist: [
      { id: 'place_tx', label: 'Place 3-Phase Transformer' },
      { id: 'conn_hv', label: 'Connect Supply to HV Primary (R, Y, B)' },
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
    id: 'T4',
    title: 'Secondary Distribution',
    description: 'The Secondary side provides 415V (Phase-to-Phase) and 230V (Phase-to-Neutral). Connect a Load to the Secondary.',
    allowedParts: [COMPONENT_TYPES.SUPPLY_3P, COMPONENT_TYPES.TRANSFORMER_3P, COMPONENT_TYPES.LOAD_3P_BALANCED],
    checklist: [
      { id: 'conn_sec', label: 'Connect Load to Transformer Secondary (R, Y, B)' },
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
  }
];
