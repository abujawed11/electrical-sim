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
  [COMPONENT_TYPES.SOLAR_INVERTER]: {
    name: 'Solar Inverter (External Batt)',
    defaultProperties: {
      label: 'SOL-INV',
      capacityVA: 2000,
      enabled: true,
      isBypassMode: false,
      efficiency: 0.9,

      // Output capability + overload behavior
      ratedW: 1000,
      surgeW: 2000,
      surgeSec: 2,
      overloadDelaySec: 1,

      // Live state (updated by simulation)
      status: 'OFF', // ON, OVERLOAD, TRIPPED, OFF, BYPASS
      isTripped: false,
      overloadActive: false,
      overloadTimerSec: 0,
      canInvert: true, // gated by battery/Solar in evaluateSolar

      loadW: 0,
      loadA: 0,
      outputW: 0,
      outputA: 0,
      dcInputW: 0,
      dcInputA: 0,
      dcLoadW: 0,

      // Battery net state (updated by simulation)
      isCharging: false,
      // Display props (updated by simulation)
      socWh: 0,
      socPercent: 0,
      totalCapacityWh: 0,
      batteryVoltage: 0,
    },
    terminals: [
      { id: 'AC_IN_L', kind: TERMINAL_KINDS.PHASE, relX: -30, relY: -45, label: 'IN-L' },
      { id: 'AC_IN_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -10, relY: -45, label: 'IN-N' },
      { id: 'AC_OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 30, relY: 45, label: 'OUT-L' },
      { id: 'AC_OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 45, label: 'OUT-N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 0, relY: 0, label: 'E' },
      { id: 'BAT_POS', kind: TERMINAL_KINDS.DC_POS, relX: -35, relY: 0, label: 'BAT+' },
      { id: 'BAT_NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 35, relY: 0, label: 'BAT-' },
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
  [COMPONENT_TYPES.FEEDER_11KV]: {
    name: '11 kV Feeder (Substation)',
    defaultProperties: {
      label: '11kV SOURCE',
      enabled: true,
      voltage: 11000,
    },
    terminals: [
      { id: 'R', kind: TERMINAL_KINDS.HV_PHASE_R, relX: -30, relY: 30, label: 'R (11kV)' },
      { id: 'Y', kind: TERMINAL_KINDS.HV_PHASE_Y, relX: -10, relY: 30, label: 'Y (11kV)' },
      { id: 'B', kind: TERMINAL_KINDS.HV_PHASE_B, relX: 10, relY: 30, label: 'B (11kV)' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 30, relY: 30, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.SUPPLY_3P]: {
    name: '3-Phase Supply',
    defaultProperties: {
      label: '3-PH MAINS',
      enabled: true,
      voltage: 415,
    },
    terminals: [
      { id: 'R', kind: TERMINAL_KINDS.PHASE_R, relX: -30, relY: 25, label: 'R' },
      { id: 'Y', kind: TERMINAL_KINDS.PHASE_Y, relX: -10, relY: 25, label: 'Y' },
      { id: 'B', kind: TERMINAL_KINDS.PHASE_B, relX: 10, relY: 25, label: 'B' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 30, relY: 25, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 50, relY: 25, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.TRANSFORMER_3P]: {
    name: '3-Phase Transformer',
    defaultProperties: {
      label: 'TX-1',
      kVA: 100,
      primaryVoltage: 11000, // 11kV
      secondaryVoltage: 415, // 415V
      connection: 'DELTA_STAR', // DELTA_STAR, STAR_STAR, etc.
    },
    terminals: [
      // Primary (HV)
      { id: 'PRI_R', kind: TERMINAL_KINDS.HV_PHASE_R, relX: -40, relY: -40, label: 'HV-R' },
      { id: 'PRI_Y', kind: TERMINAL_KINDS.HV_PHASE_Y, relX: 0, relY: -40, label: 'HV-Y' },
      { id: 'PRI_B', kind: TERMINAL_KINDS.HV_PHASE_B, relX: 40, relY: -40, label: 'HV-B' },
      // Secondary (LV)
      { id: 'SEC_R', kind: TERMINAL_KINDS.PHASE_R, relX: -40, relY: 40, label: 'r' },
      { id: 'SEC_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: -15, relY: 40, label: 'y' },
      { id: 'SEC_B', kind: TERMINAL_KINDS.PHASE_B, relX: 15, relY: 40, label: 'b' },
      { id: 'SEC_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 40, relY: 40, label: 'n' },
    ],
  },
  [COMPONENT_TYPES.LOAD_3P_BALANCED]: {
    name: '3-Phase Load (Motor)',
    defaultProperties: {
      label: 'M-1',
      powerKW: 5,
      powerFactor: 0.85,
      type: 'MOTOR',
    },
    terminals: [
      { id: 'R', kind: TERMINAL_KINDS.PHASE_R, relX: -20, relY: 30, label: 'R' },
      { id: 'Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 0, relY: 30, label: 'Y' },
      { id: 'B', kind: TERMINAL_KINDS.PHASE_B, relX: 20, relY: 30, label: 'B' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 40, relY: 30, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.METER_3P]: {
    name: '3-Phase Energy Meter',
    defaultProperties: {
      label: '3-PH METER',
      ratePerUnit: 10,
    },
    terminals: [
      { id: 'IN_R', kind: TERMINAL_KINDS.PHASE_R, relX: -35, relY: 42, label: 'R-I' },
      { id: 'IN_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: -25, relY: 42, label: 'Y-I' },
      { id: 'IN_B', kind: TERMINAL_KINDS.PHASE_B, relX: -15, relY: 42, label: 'B-I' },
      { id: 'IN_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -5, relY: 42, label: 'N-I' },
      { id: 'OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 5, relY: 42, label: 'N-O' },
      { id: 'OUT_B', kind: TERMINAL_KINDS.PHASE_B, relX: 15, relY: 42, label: 'B-O' },
      { id: 'OUT_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 25, relY: 42, label: 'Y-O' },
      { id: 'OUT_R', kind: TERMINAL_KINDS.PHASE_R, relX: 35, relY: 42, label: 'R-O' },
    ],
  },
  [COMPONENT_TYPES.MCB_3P]: {
    name: '3-Pole MCB (Main)',
    defaultProperties: {
      label: 'MCCB-1',
      rating: '63A',
      isOn: true,
      isTripped: false,
    },
    terminals: [
      { id: 'IN_R', kind: TERMINAL_KINDS.PHASE_R, relX: -25, relY: -46, label: 'R-I' },
      { id: 'IN_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 0, relY: -46, label: 'Y-I' },
      { id: 'IN_B', kind: TERMINAL_KINDS.PHASE_B, relX: 25, relY: -46, label: 'B-I' },
      { id: 'OUT_R', kind: TERMINAL_KINDS.PHASE_R, relX: -25, relY: 46, label: 'R-O' },
      { id: 'OUT_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 0, relY: 46, label: 'Y-O' },
      { id: 'OUT_B', kind: TERMINAL_KINDS.PHASE_B, relX: 25, relY: 46, label: 'B-O' },
    ],
  },
  [COMPONENT_TYPES.ISOLATOR_3P]: {
    name: '3-Pole Isolator',
    defaultProperties: {
      label: 'ISO-1',
      isOn: false,
    },
    terminals: [
      { id: 'IN_R', kind: TERMINAL_KINDS.PHASE_R, relX: -25, relY: -40, label: 'R-I' },
      { id: 'IN_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 0, relY: -40, label: 'Y-I' },
      { id: 'IN_B', kind: TERMINAL_KINDS.PHASE_B, relX: 25, relY: -40, label: 'B-I' },
      { id: 'OUT_R', kind: TERMINAL_KINDS.PHASE_R, relX: -25, relY: 40, label: 'R-O' },
      { id: 'OUT_Y', kind: TERMINAL_KINDS.PHASE_Y, relX: 0, relY: 40, label: 'Y-O' },
      { id: 'OUT_B', kind: TERMINAL_KINDS.PHASE_B, relX: 25, relY: 40, label: 'B-O' },
    ],
  },
  [COMPONENT_TYPES.BUSBAR_R]: {
    name: 'Busbar: Phase R',
    defaultProperties: { label: 'R-BUS' },
    terminals: Array.from({ length: 6 }).map((_, i) => ({
      id: `T${i + 1}`,
      kind: TERMINAL_KINDS.PHASE_R,
      relX: 0,
      relY: -60 + i * 24,
      label: `R${i + 1}`,
    })),
  },
  [COMPONENT_TYPES.BUSBAR_Y]: {
    name: 'Busbar: Phase Y',
    defaultProperties: { label: 'Y-BUS' },
    terminals: Array.from({ length: 6 }).map((_, i) => ({
      id: `T${i + 1}`,
      kind: TERMINAL_KINDS.PHASE_Y,
      relX: 0,
      relY: -60 + i * 24,
      label: `Y${i + 1}`,
    })),
  },
  [COMPONENT_TYPES.BUSBAR_B]: {
    name: 'Busbar: Phase B',
    defaultProperties: { label: 'B-BUS' },
    terminals: Array.from({ length: 6 }).map((_, i) => ({
      id: `T${i + 1}`,
      kind: TERMINAL_KINDS.PHASE_B,
      relX: 0,
      relY: -60 + i * 24,
      label: `B${i + 1}`,
    })),
  },
  [COMPONENT_TYPES.PHASE_INDICATOR]: {
    name: '3-Phase Indicator',
    defaultProperties: { label: 'PHASE IND' },
    terminals: [
      { id: 'R', kind: TERMINAL_KINDS.PHASE_R, relX: -30, relY: 20, label: 'R' },
      { id: 'Y', kind: TERMINAL_KINDS.PHASE_Y, relX: -10, relY: 20, label: 'Y' },
      { id: 'B', kind: TERMINAL_KINDS.PHASE_B, relX: 10, relY: 20, label: 'B' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 30, relY: 20, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.SOLAR_PANEL]: {
    name: 'Solar Panel (PV)',
    defaultProperties: {
      label: 'PV-1',
      powerW: 200, // Rated Power
      voc: 22, // Open Circuit Voltage
      vmp: 18, // Max Power Voltage
      isc: 11, // Short Circuit Current
      imp: 11, // Max Power Current
      enabled: true,
    },
    terminals: [
      { id: 'POS', kind: TERMINAL_KINDS.DC_POS, relX: -15, relY: 40, label: '+' },
      { id: 'NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 15, relY: 40, label: '-' },
    ],
  },
  [COMPONENT_TYPES.BATTERY]: {
    name: 'Battery (Lead Acid)',
    defaultProperties: {
      label: 'BAT-1',
      voltage: 12,
      capacityAh: 150,
      socAh: 150, // State of Charge
      soh: 100, // State of Health
      isCharging: false,
      isDischarging: false,
      batteryState: 'IDLE',
    },
    terminals: [
      { id: 'POS', kind: TERMINAL_KINDS.DC_POS, relX: -20, relY: -30, label: '+' },
      { id: 'NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 20, relY: -30, label: '-' },
    ],
  },
  [COMPONENT_TYPES.SOLAR_CONTROLLER]: {
    name: 'Solar Charge Controller (MPPT)',
    defaultProperties: {
      label: 'MPPT-1',
      ratingA: 40, // Max Charging Current
      systemVoltage: 12, // Auto-detect usually
      efficiency: 0.95,
      enabled: true,
      commonNegative: false,
      isCharging: false,
      pvInputW: 0,
      inputPowerW: 0, // legacy/alias used by some UI
      chargingW: 0,
      chargingA: 0,
      avgBatteryV: 0,
      mpptLimitW: 0,
      efficiencyUsed: 0.95,
      connectedPanels: 0,
      connectedBatteries: 0,
      mode: 'IDLE',
      lastTickReason: '',
    },
    terminals: [
      { id: 'PV_POS', kind: TERMINAL_KINDS.DC_POS, relX: -30, relY: -40, label: 'PV+' },
      { id: 'PV_NEG', kind: TERMINAL_KINDS.DC_NEG, relX: -10, relY: -40, label: 'PV-' },
      { id: 'BAT_POS', kind: TERMINAL_KINDS.DC_POS, relX: 10, relY: 40, label: 'BAT+' },
      { id: 'BAT_NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 30, relY: 40, label: 'BAT-' },
    ],
  },
  [COMPONENT_TYPES.DC_MCB]: {
    name: 'DC MCB',
    defaultProperties: {
      label: 'DC-MCB',
      rating: '32A',
      isOn: true,
      isTripped: false,
    },
    terminals: [
      { id: 'IN_POS', kind: TERMINAL_KINDS.DC_POS, relX: -10, relY: -30, label: 'IN+' },
      { id: 'OUT_POS', kind: TERMINAL_KINDS.DC_POS, relX: -10, relY: 30, label: 'OUT+' },
      // Optional Neg pass-through or just single pole
      // Usually DC breakers are 2-pole for solar
      { id: 'IN_NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 10, relY: -30, label: 'IN-' },
      { id: 'OUT_NEG', kind: TERMINAL_KINDS.DC_NEG, relX: 10, relY: 30, label: 'OUT-' },
    ],
  },
};
