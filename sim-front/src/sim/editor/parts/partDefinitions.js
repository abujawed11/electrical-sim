import { COMPONENT_TYPES, TERMINAL_KINDS, LOAD_TYPES } from '../types';

export const PART_DEFINITIONS = {
  [COMPONENT_TYPES.SUPPLY]: {
    name: 'Mains Supply',
    defaultProperties: {
      label: 'MAINS',
      enabled: true,
    },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: 20, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 25, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: -20, relY: 25, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.METER]: {
    name: 'Energy Meter',
    defaultProperties: {
      label: 'METER',
    },
    terminals: [
      { id: 'IN_L', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: 42, label: 'L-I' },
      { id: 'IN_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -10, relY: 42, label: 'N-I' },
      { id: 'OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 42, label: 'N-O' },
      { id: 'OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 20, relY: 42, label: 'L-O' },
    ],
  },
  [COMPONENT_TYPES.NEUTRAL_BAR]: {
    name: 'Neutral Bar',
    defaultProperties: { label: 'N-BAR' },
    terminals: Array.from({ length: 6 }).map((_, i) => ({
      id: `N${i + 1}`,
      kind: TERMINAL_KINDS.NEUTRAL,
      relX: 0,
      relY: -60 + i * 24, 
      label: `N${i + 1}`,
    })),
  },
  [COMPONENT_TYPES.EARTH_BAR]: {
    name: 'Earth Bar',
    defaultProperties: { label: 'E-BAR' },
    terminals: Array.from({ length: 6 }).map((_, i) => ({
      id: `E${i + 1}`,
      kind: TERMINAL_KINDS.EARTH,
      relX: 0,
      relY: -60 + i * 24,
      label: `E${i + 1}`,
    })),
  },
  [COMPONENT_TYPES.BUSBAR]: {
    name: 'Phase Busbar',
    defaultProperties: { label: 'BUS' },
    terminals: [
      { id: 'IN', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: -60, label: 'IN' },
      ...Array.from({ length: 5 }).map((_, i) => ({
        id: `OUT${i + 1}`,
        kind: TERMINAL_KINDS.PHASE,
        relX: 0,
        relY: -30 + i * 24,
        label: `O${i + 1}`,
      })),
    ],
  },
  [COMPONENT_TYPES.MCB]: {
    name: 'Miniature Circuit Breaker',
    defaultProperties: {
      label: 'MCB-1',
      rating: '16A',
      isOn: true,
      isTripped: false,
    },
    terminals: [
      { id: 'LIN', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: -28, label: 'IN' },
      { id: 'LOUT', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: 28, label: 'OUT' },
    ],
  },
  [COMPONENT_TYPES.RCCB]: {
    name: 'RCCB (ELCB)',
    defaultProperties: {
      label: 'RCCB',
      rating: '63A',
      sensitivity: '30mA',
      isOn: true,
      isTripped: false,
    },
    terminals: [
      { id: 'L_IN', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: -46, label: 'L-I' },
      { id: 'N_IN', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: -46, label: 'N-I' },
      { id: 'L_OUT', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 46, label: 'L-O' },
      { id: 'N_OUT', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: 46, label: 'N-O' },
    ],
  },
  [COMPONENT_TYPES.RCBO]: {
    name: 'RCBO',
    defaultProperties: {
      label: 'RCBO',
      rating: '20A',
      sensitivity: '30mA',
      isOn: true,
      isTripped: false,
    },
    terminals: [
      { id: 'L_IN', kind: TERMINAL_KINDS.PHASE, relX: -8, relY: -46, label: 'L-I' },
      { id: 'N_IN', kind: TERMINAL_KINDS.NEUTRAL, relX: 8, relY: -46, label: 'N-I' },
      { id: 'L_OUT', kind: TERMINAL_KINDS.PHASE, relX: -8, relY: 46, label: 'L-O' },
      { id: 'N_OUT', kind: TERMINAL_KINDS.NEUTRAL, relX: 8, relY: 46, label: 'N-O' },
    ],
  },
  [COMPONENT_TYPES.SWITCH]: {
    name: 'SP Switch',
    defaultProperties: {
      label: 'SW-1',
      isOn: false,
    },
    terminals: [
      { id: 'IN_L', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: -18, label: 'IN' },
      { id: 'OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: 18, label: 'OUT' },
    ],
  },
  [COMPONENT_TYPES.LAMP]: {
    name: 'Lamp Load',
    defaultProperties: { label: 'L-1', powerW: 60, powerFactor: 1.0, loadType: LOAD_TYPES.RESISTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -10, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 25, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.GENERIC_LOAD]: {
    name: 'Generic Load',
    defaultProperties: { label: 'LOAD-1', powerW: 1000, powerFactor: 0.9, loadType: LOAD_TYPES.INDUCTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 25, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 25, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.FAN]: {
    name: 'Ceiling Fan',
    defaultProperties: { label: 'FAN-1', powerW: 75, powerFactor: 0.7, loadType: LOAD_TYPES.INDUCTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 20, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: 20, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.AC]: {
    name: 'Air Conditioner',
    defaultProperties: { label: 'AC-1', powerW: 1500, powerFactor: 0.85, loadType: LOAD_TYPES.INDUCTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 25, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 20, relY: 25, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.HEATER]: {
    name: 'Electric Heater',
    defaultProperties: { label: 'HEAT-1', powerW: 2000, powerFactor: 1.0, loadType: LOAD_TYPES.RESISTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 30, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 30, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 30, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.GEYSER]: {
    name: 'Water Geyser',
    defaultProperties: { label: 'GEYSER-1', powerW: 2500, powerFactor: 1.0, loadType: LOAD_TYPES.RESISTIVE },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 30, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 30, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 30, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.SOCKET]: {
    name: 'Power Socket',
    defaultProperties: {
      label: 'S-1',
      rating: '13A',
    },
    terminals: [
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 0, relY: -18, label: 'E' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: -15, relY: 15, label: 'N' },
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: 15, relY: 15, label: 'L' },
    ],
  },
  [COMPONENT_TYPES.FAULT_SHORT_LN]: {
    name: 'Fault: Short L-N',
    defaultProperties: { label: 'SHORT' },
    terminals: [
      { id: 'A', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 0, label: 'L' },
      { id: 'B', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: 0, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.FAULT_LEAK_LE]: {
    name: 'Fault: Leak L-E',
    defaultProperties: { label: 'LEAK' },
    terminals: [
      { id: 'A', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 0, label: 'L' },
      { id: 'B', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 0, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.HUMAN_BODY]: {
    name: 'Human Body (Shock)',
    defaultProperties: { label: 'HUMAN', resistanceOhms: 1000 },
    terminals: [
      { id: 'HAND', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: -10, label: 'HAND' },
      { id: 'FEET', kind: TERMINAL_KINDS.EARTH, relX: 20, relY: 30, label: 'FEET' },
    ],
  },
  [COMPONENT_TYPES.JUNCTION_BOX]: {
    name: 'Junction Box',
    defaultProperties: { label: 'JB' },
    terminals: [
      { id: 'T1', kind: TERMINAL_KINDS.GENERIC, relX: 0, relY: -20, label: '1' },
      { id: 'T2', kind: TERMINAL_KINDS.GENERIC, relX: 20, relY: 0, label: '2' },
      { id: 'T3', kind: TERMINAL_KINDS.GENERIC, relX: 0, relY: 20, label: '3' },
      { id: 'T4', kind: TERMINAL_KINDS.GENERIC, relX: -20, relY: 0, label: '4' },
    ],
  },
  [COMPONENT_TYPES.INVERTER]: {
    name: 'Inverter (UPS)',
    defaultProperties: {
      label: 'INV-1',
      capacityVA: 900,
      batteryWh: 1200,
      socWh: 1200,
      chargingPowerW: 200, // Charging rate
      enabled: true,
      isOverloaded: false,
      isCharging: false,
      isBypassMode: false, // Internal relay state: true = Mains->Out, false = Battery->Out
      status: 'Inverter', // 'Mains (Bypass)' or 'Inverter'
      overloadShutdownDelayMs: 30000, // 30 seconds delay before shutdown
      overloadStartTime: 0, // When overload was first detected
      isAlarming: false, // Buzzer/alarm state
    },
    terminals: [
      { id: 'AC_IN_L', kind: TERMINAL_KINDS.PHASE, relX: -25, relY: -40, label: 'IN-L' },
      { id: 'AC_IN_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -5, relY: -40, label: 'IN-N' },
      { id: 'AC_OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 25, relY: 40, label: 'OUT-L' },
      { id: 'AC_OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 5, relY: 40, label: 'OUT-N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 0, relY: 0, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.CHANGEOVER]: {
    name: 'Changeover Switch',
    defaultProperties: {
      label: 'CHG-1',
      position: 'MAINS', // 'MAINS', 'INVERTER', 'OFF'
      mode: 'MANUAL', // 'MANUAL', 'AUTO'
      transferDelayMs: 200,
      upsMode: false,
      autoStatus: 'Using MAINS', // Informational text for UI
      transferStartTime: 0, // Internal state for delay
    },
    terminals: [
      { id: 'A_L', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: -30, label: 'A-L' }, // Mains
      { id: 'A_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -5, relY: -30, label: 'A-N' },
      { id: 'B_L', kind: TERMINAL_KINDS.PHASE, relX: 20, relY: -30, label: 'B-L' }, // Inverter
      { id: 'B_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 35, relY: -30, label: 'B-N' },
      { id: 'OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: 30, label: 'L' },
      { id: 'OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: 30, label: 'N' },
    ],
  },
};
