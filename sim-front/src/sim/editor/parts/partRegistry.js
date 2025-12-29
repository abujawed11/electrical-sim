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
import { JunctionBox } from './JunctionBox';
import { Inverter } from './Inverter';
import { Changeover } from './Changeover';
import { Supply3P } from './Supply3P';
import { Transformer3P } from './Transformer3P';
import { Load3P } from './Load3P';
import { Meter3P } from './Meter3P';
import { MCB3P } from './MCB3P';
import { Busbar3P } from './Busbar3P';
import { PhaseIndicator } from './PhaseIndicator';

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
  [COMPONENT_TYPES.JUNCTION_BOX]: JunctionBox,
  [COMPONENT_TYPES.INVERTER]: Inverter,
  [COMPONENT_TYPES.CHANGEOVER]: Changeover,
  [COMPONENT_TYPES.SUPPLY_3P]: Supply3P,
  [COMPONENT_TYPES.TRANSFORMER_3P]: Transformer3P,
  [COMPONENT_TYPES.LOAD_3P_BALANCED]: Load3P,
  [COMPONENT_TYPES.METER_3P]: Meter3P,
  [COMPONENT_TYPES.MCB_3P]: MCB3P,
  [COMPONENT_TYPES.BUSBAR_R]: Busbar3P,
  [COMPONENT_TYPES.BUSBAR_Y]: Busbar3P,
  [COMPONENT_TYPES.BUSBAR_B]: Busbar3P,
  [COMPONENT_TYPES.PHASE_INDICATOR]: PhaseIndicator,
};


export const PART_REGISTRY = Object.keys(PART_DEFINITIONS).reduce((acc, key) => {
  acc[key] = {
    ...PART_DEFINITIONS[key],
    component: COMPONENTS[key],
  };
  return acc;
}, {});