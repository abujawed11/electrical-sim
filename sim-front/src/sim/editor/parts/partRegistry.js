import { COMPONENT_TYPES } from '../types';
import { PART_DEFINITIONS } from './partDefinitions';

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
import { Fan } from './Fan';
import { AC } from './AC';
import { Heater } from './Heater';
import { Geyser } from './Geyser';

const COMPONENTS = {
  [COMPONENT_TYPES.SUPPLY]: Supply,
  [COMPONENT_TYPES.METER]: Meter,
  [COMPONENT_TYPES.NEUTRAL_BAR]: NeutralBar,
  [COMPONENT_TYPES.EARTH_BAR]: EarthBar,
  [COMPONENT_TYPES.BUSBAR]: Busbar,
  [COMPONENT_TYPES.MCB]: MCB,
  [COMPONENT_TYPES.RCCB]: RCCB,
  [COMPONENT_TYPES.RCBO]: RCBO,
  [COMPONENT_TYPES.SWITCH]: Switch,
  [COMPONENT_TYPES.LAMP]: Lamp,
  [COMPONENT_TYPES.GENERIC_LOAD]: GenericLoad,
  [COMPONENT_TYPES.FAN]: Fan,
  [COMPONENT_TYPES.AC]: AC,
  [COMPONENT_TYPES.HEATER]: Heater,
  [COMPONENT_TYPES.GEYSER]: Geyser,
  [COMPONENT_TYPES.SOCKET]: Socket,
  [COMPONENT_TYPES.FAULT_SHORT_LN]: FaultShortLN,
  [COMPONENT_TYPES.FAULT_LEAK_LE]: FaultLeakLE,
  [COMPONENT_TYPES.HUMAN_BODY]: HumanBody,
};

export const PART_REGISTRY = Object.keys(PART_DEFINITIONS).reduce((acc, key) => {
  acc[key] = {
    ...PART_DEFINITIONS[key],
    component: COMPONENTS[key],
  };
  return acc;
}, {});
