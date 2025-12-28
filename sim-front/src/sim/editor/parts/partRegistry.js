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
      { id: 'IN_L', kind: TERMINAL_KINDS.PHASE, relX: -20, relY: 42, label: 'L-IN' },
      { id: 'IN_N', kind: TERMINAL_KINDS.NEUTRAL, relX: -10, relY: 42, label: 'N-IN' },
      { id: 'OUT_N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 42, label: 'N-OUT' },
      { id: 'OUT_L', kind: TERMINAL_KINDS.PHASE, relX: 20, relY: 42, label: 'L-OUT' },
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
      relY: -60 + i * 24, // Vertically distributed
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
    },
    terminals: [
      { id: 'LIN', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: -28, label: 'IN' },
      { id: 'LOUT', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: 28, label: 'OUT' },
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
    defaultProperties: { label: 'L-1' },
    terminals: [
      { id: 'L', kind: TERMINAL_KINDS.PHASE, relX: -10, relY: 25, label: 'L' },
      { id: 'N', kind: TERMINAL_KINDS.NEUTRAL, relX: 10, relY: 25, label: 'N' },
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
};