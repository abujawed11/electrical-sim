import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { MCB } from './MCB';
import { Socket } from './Socket';

export const PART_REGISTRY = {
  [COMPONENT_TYPES.MCB]: {
    name: 'Miniature Circuit Breaker',
    component: MCB,
    defaultProperties: {
      label: 'MCB-1',
      rating: '16A',
    },
    terminals: [
      { id: 'L_IN', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: -28, label: 'IN' },
      { id: 'L_OUT', kind: TERMINAL_KINDS.PHASE, relX: 0, relY: 28, label: 'OUT' },
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