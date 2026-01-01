import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../store';
import { COMPONENT_TYPES } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';
import {
  Zap, Gauge, MinusCircle, ArrowDownCircle, Equal, ToggleRight,
  ShieldAlert, ToggleLeft, Lightbulb, Box, Fan, Snowflake, Flame,
  Droplets, Plug, AlertTriangle, User, Grid, BatteryCharging,
  Shuffle, Activity, Settings, ChevronDown, ChevronRight, Trash2, TowerControl,
  Sun, Cpu, Undo, Redo
} from 'lucide-react';

// Icon Mapping
const TYPE_ICONS = {
  [COMPONENT_TYPES.SUPPLY]: Zap,
  [COMPONENT_TYPES.SUPPLY_3P]: Zap,
  [COMPONENT_TYPES.FEEDER_11KV]: TowerControl,
  [COMPONENT_TYPES.TRANSFORMER_3P]: Activity,
  [COMPONENT_TYPES.METER]: Gauge,
  [COMPONENT_TYPES.METER_3P]: Gauge,
  [COMPONENT_TYPES.PHASE_INDICATOR]: Activity,
  
  [COMPONENT_TYPES.NEUTRAL_BAR]: MinusCircle,
  [COMPONENT_TYPES.EARTH_BAR]: ArrowDownCircle,
  [COMPONENT_TYPES.BUSBAR]: Equal,
  [COMPONENT_TYPES.BUSBAR_R]: Equal,
  [COMPONENT_TYPES.BUSBAR_Y]: Equal,
  [COMPONENT_TYPES.BUSBAR_B]: Equal,
  [COMPONENT_TYPES.JUNCTION_BOX]: Grid,

  [COMPONENT_TYPES.MCB]: ToggleRight,
  [COMPONENT_TYPES.MCB_3P]: ToggleRight,
  [COMPONENT_TYPES.RCCB]: ShieldAlert,
  [COMPONENT_TYPES.RCBO]: ShieldAlert,
  [COMPONENT_TYPES.DC_MCB]: ToggleRight,

  [COMPONENT_TYPES.SWITCH]: ToggleLeft,
  [COMPONENT_TYPES.ISOLATOR_3P]: ToggleLeft,
  [COMPONENT_TYPES.CHANGEOVER]: Shuffle,
  [COMPONENT_TYPES.ATS]: Shuffle,
  [COMPONENT_TYPES.INVERTER]: BatteryCharging,
  [COMPONENT_TYPES.SOLAR_INVERTER]: BatteryCharging,

  [COMPONENT_TYPES.SOLAR_PANEL]: Sun,
  [COMPONENT_TYPES.SOLAR_CONTROLLER]: Cpu,
  [COMPONENT_TYPES.BATTERY]: BatteryCharging,

  [COMPONENT_TYPES.LAMP]: Lightbulb,
  [COMPONENT_TYPES.GENERIC_LOAD]: Box,
  [COMPONENT_TYPES.FAN]: Fan,
  [COMPONENT_TYPES.AC]: Snowflake,
  [COMPONENT_TYPES.HEATER]: Flame,
  [COMPONENT_TYPES.GEYSER]: Droplets,
  [COMPONENT_TYPES.SOCKET]: Plug,
  [COMPONENT_TYPES.LOAD_3P_BALANCED]: Settings,

  [COMPONENT_TYPES.FAULT_SHORT_LN]: AlertTriangle,
  [COMPONENT_TYPES.FAULT_LEAK_LE]: AlertTriangle,
  [COMPONENT_TYPES.HUMAN_BODY]: User,
};

const CATEGORIES = [
  {
    id: 'solar',
    title: 'Solar & DC',
    types: [
      COMPONENT_TYPES.SOLAR_PANEL,
      COMPONENT_TYPES.SOLAR_CONTROLLER,
      COMPONENT_TYPES.BATTERY,
      COMPONENT_TYPES.DC_MCB,
      COMPONENT_TYPES.SOLAR_INVERTER,
      COMPONENT_TYPES.INVERTER, // Shared
    ]
  },
  {
    id: 'sources',
    title: 'Power & Metering',
    types: [
      COMPONENT_TYPES.SUPPLY,
      COMPONENT_TYPES.SUPPLY_3P,
      COMPONENT_TYPES.FEEDER_11KV,
      COMPONENT_TYPES.TRANSFORMER_3P,
      COMPONENT_TYPES.METER,
      COMPONENT_TYPES.METER_3P,
      COMPONENT_TYPES.PHASE_INDICATOR,
    ]
  },
  {
    id: 'protection',
    title: 'AC Protection',
    types: [
      COMPONENT_TYPES.MCB,
      COMPONENT_TYPES.MCB_3P,
      COMPONENT_TYPES.RCCB,
      COMPONENT_TYPES.RCBO,
    ]
  },
  {
    id: 'controls',
    title: 'Switches & Control',
    types: [
      COMPONENT_TYPES.SWITCH,
      COMPONENT_TYPES.ISOLATOR_3P,
      COMPONENT_TYPES.CHANGEOVER,
      COMPONENT_TYPES.ATS,
    ]
  },
  {
    id: 'loads',
    title: 'Loads',
    types: [
      COMPONENT_TYPES.LAMP,
      COMPONENT_TYPES.FAN,
      COMPONENT_TYPES.SOCKET,
      COMPONENT_TYPES.AC,
      COMPONENT_TYPES.HEATER,
      COMPONENT_TYPES.GEYSER,
      COMPONENT_TYPES.GENERIC_LOAD,
      COMPONENT_TYPES.LOAD_3P_BALANCED,
    ]
  },
  {
    id: 'wiring',
    title: 'Wiring & Connectors',
    types: [
      COMPONENT_TYPES.NEUTRAL_BAR,
      COMPONENT_TYPES.EARTH_BAR,
      COMPONENT_TYPES.BUSBAR,
      COMPONENT_TYPES.BUSBAR_R,
      COMPONENT_TYPES.BUSBAR_Y,
      COMPONENT_TYPES.BUSBAR_B,
      COMPONENT_TYPES.JUNCTION_BOX,
    ]
  },
  {
    id: 'hazards',
    title: 'Hazards & Faults',
    types: [
      COMPONENT_TYPES.FAULT_SHORT_LN,
      COMPONENT_TYPES.FAULT_LEAK_LE,
      COMPONENT_TYPES.HUMAN_BODY,
    ]
  }
];

export const Toolbox = () => {
  const addComponent = useEditorStore((state) => state.addComponent);
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const allowedParts = useEditorStore((state) => state.allowedParts);
  const clearAll = useEditorStore((state) => state.clearAll);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);

  // Filter available types first
  const availableTypeSet = useMemo(() => {
    const all = Object.values(COMPONENT_TYPES);
    if (mode === 'SANDBOX') return new Set(all);
    if (!allowedParts) return new Set(all);
    return new Set(allowedParts);
  }, [mode, allowedParts]);

  const handleClear = () => {
      if (window.confirm("Are you sure you want to clear the entire canvas? This action cannot be undone.")) {
          clearAll();
      }
  };

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-xl z-20">
      {/* Header / Mode Switcher */}
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <h1 className="text-gray-100 font-bold text-lg mb-3 tracking-tight">Electrical Sim</h1>
        <div className="flex bg-gray-800 rounded-lg p-1">
            <ModeButton 
              active={mode === 'SANDBOX'} 
              onClick={() => setMode('SANDBOX')} 
              label="Sandbox" 
            />
            <ModeButton 
              active={mode === 'GUIDED'} 
              onClick={() => setMode('GUIDED')} 
              label="Guided" 
            />
        </div>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {CATEGORIES.map(category => {
          const visibleTypes = category.types.filter(t => availableTypeSet.has(t));
          if (visibleTypes.length === 0) return null;

          return (
            <CategorySection 
              key={category.id} 
              title={category.title} 
              types={visibleTypes}
              onAdd={addComponent}
            />
          );
        })}
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <button
          onClick={handleClear}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-200 hover:text-red-100 rounded-lg text-sm font-medium border border-red-900/50 transition-all duration-200"
        >
          <Trash2 size={16} />
          Clear Canvas
        </button>

        {/* Undo/Redo Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
              canUndo()
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border-gray-700 hover:border-gray-600'
                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
              canRedo()
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border-gray-700 hover:border-gray-600'
                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
            Redo
          </button>
        </div>

        <div className="mt-4 text-[10px] text-gray-500 text-center">
          <p>Pan: Right-Click or Space+Drag</p>
          <p>Zoom: Mouse Wheel</p>
        </div>
      </div>
    </div>
  );
};

const ModeButton = ({ active, onClick, label }) => (
  <button 
    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-sm' 
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const CategorySection = ({ title, types, onAdd }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-gray-800 rounded transition-colors"
      >
        {title}
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div className="grid grid-cols-2 gap-2 p-2 pt-1">
          {types.map(type => {
             const def = PART_REGISTRY[type];
             const Icon = TYPE_ICONS[type] || Box;
             return (
               <button
                 key={type}
                 onClick={() => onAdd(type)}
                 className="flex flex-col items-center justify-center p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-all duration-200 group text-center h-20"
                 title={def.name}
               >
                 <Icon size={24} className="text-blue-400 group-hover:text-blue-300 mb-1.5 transition-colors" />
                 <span className="text-[10px] leading-tight text-gray-300 group-hover:text-white font-medium line-clamp-2">
                   {def.name}
                 </span>
               </button>
             );
          })}
        </div>
      )}
    </div>
  );
};
