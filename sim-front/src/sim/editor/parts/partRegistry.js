import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { MCB } from './MCB';
import { Socket } from './Socket';
import { Supply } from './Supply';
import { Meter } from './Meter';
import { NeutralBar } from './NeutralBar';
import { EarthBar } from './EarthBar';
import { Busbar } from './Busbar';
import { Switch } from './Switch';
import { Lamp } from './Lamp';
import { RCCB } from './RCCB';
import { RCBO } from './RCBO';
import { FaultShortLN } from './FaultShortLN';
import { FaultLeakLE } from './FaultLeakLE';
import { HumanBody } from './HumanBody';
import { GenericLoad } from './GenericLoad';

export const PART_REGISTRY = {
  [COMPONENT_TYPES.SUPPLY]: {
    name: 'Mains Supply',
    component: Supply,
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
    component: Meter,
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
    component: NeutralBar,
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
    component: EarthBar,
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
    component: Busbar,
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
    component: MCB,
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
    component: RCCB,
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
    component: RCBO,
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
    component: Switch,
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
    component: Lamp,
    defaultProperties: { label: 'L-1', powerW: 60 },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -10, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 25, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.GENERIC_LOAD]: {
    name: 'Generic Load',
    component: GenericLoad,
    defaultProperties: { label: 'LOAD-1', powerW: 1000 },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 0, relY: 25, label: 'N' },
      { id: 'E', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 25, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.SOCKET]: {
    name: 'Power Socket',
    component: Socket,
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
    component: FaultShortLN,
    defaultProperties: { label: 'SHORT' },
    terminals: [
      { id: 'A', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 0, label: 'L' },
      { id: 'B', kind: TERMINAL_KINDS.NEUTRAL, relX: 15, relY: 0, label: 'N' },
    ],
  },
  [COMPONENT_TYPES.FAULT_LEAK_LE]: {
    name: 'Fault: Leak L-E',
    component: FaultLeakLE,
    defaultProperties: { label: 'LEAK' },
    terminals: [
      { id: 'A', kind: TERMINAL_KINDS.PHASE, relX: -15, relY: 0, label: 'L' },
      { id: 'B', kind: TERMINAL_KINDS.EARTH, relX: 15, relY: 0, label: 'E' },
    ],
  },
  [COMPONENT_TYPES.HUMAN_BODY]: {
    name: 'Human Body (Shock)',
    component: HumanBody,
    defaultProperties: { label: 'HUMAN', resistanceOhms: 1000 },
    terminals: [
      { id: 'HAND', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: -10, label: 'HAND' },
      { id: 'FEET', kind: TERMINAL_KINDS.EARTH, relX: 20, relY: 30, label: 'FEET' },
    ],
  },
};
