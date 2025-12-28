import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { MCB } from './MCB';
import { Socket } from './Socket';
import { Supply } from './Supply';

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
