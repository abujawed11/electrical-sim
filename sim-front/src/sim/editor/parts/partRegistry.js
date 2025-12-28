import { COMPONENT_TYPES } from '../types';
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
  },
  [COMPONENT_TYPES.SOCKET]: {
    name: 'Power Socket',
    component: Socket,
    defaultProperties: {
      label: 'S-1',
      rating: '13A',
    },
  },
};
