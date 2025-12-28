import React from 'react';
import { useEditorStore } from '../store';
import { PART_REGISTRY } from '../parts/partRegistry';
import { COMPONENT_TYPES } from '../types';

export const PropertiesPanel = () => {
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const components = useEditorStore((state) => state.components);
  const wires = useEditorStore((state) => state.wires);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const deleteWire = useEditorStore((state) => state.deleteWire);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Computed data
  const { loadData, deviceLoads } = simulationState;

  // Case 1: Wire Selected
  if (selectedWireId) {
    const wire = wires.find(w => w.id === selectedWireId);
    if (!wire) return <EmptyPanel />;

    const fromComp = components.find(c => c.id === wire.from.compId);
    const toComp = components.find(c => c.id === wire.to.compId);

    return (
      <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col p-4">
        <h2 className="text-gray-200 font-bold mb-4 uppercase text-xs tracking-wider">Wire Properties</h2>
        
        <div className="mb-4 space-y-2">
           <div className="p-2 bg-gray-700 rounded border border-gray-600">
             <div className="text-xs text-gray-400">From</div>
             <div className="text-sm text-gray-200 font-medium">
                {fromComp?.properties.label || wire.from.compId} <span className="text-gray-400">({wire.from.terminalId})</span>
             </div>
           </div>
           
           <div className="p-2 bg-gray-700 rounded border border-gray-600">
             <div className="text-xs text-gray-400">To</div>
             <div className="text-sm text-gray-200 font-medium">
                {toComp?.properties.label || wire.to.compId} <span className="text-gray-400">({wire.to.terminalId})</span>
             </div>
           </div>
        </div>

        <button
          onClick={() => deleteWire(wire.id)}
          className="mt-4 w-full py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-800 transition-colors"
        >
          Delete Wire
        </button>
      </div>
    );
  }

  // Case 2: Component Selected
  const selectedComponent = components.find((c) => c.id === selectedId);
  if (!selectedComponent) {
    return <EmptyPanel />;
  }

  const registryItem = PART_REGISTRY[selectedComponent.type];

  const handlePropChange = (key, value) => {
    updateComponent(selectedComponent.id, {
      properties: {
        ...selectedComponent.properties,
        [key]: value,
      },
    });
  };

  const isLoad = selectedComponent.type === COMPONENT_TYPES.LAMP || selectedComponent.type === COMPONENT_TYPES.GENERIC_LOAD;
  const isBreaker = selectedComponent.type === COMPONENT_TYPES.MCB || selectedComponent.type === COMPONENT_TYPES.RCBO;
  const isRCCB = selectedComponent.type === COMPONENT_TYPES.RCCB;

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col p-4 overflow-y-auto">
      <h2 className="text-gray-200 font-bold mb-4 uppercase text-xs tracking-wider">Component Properties</h2>

      <div className="mb-6">
        <label className="text-xs text-gray-400 block mb-1">Type</label>
        <div className="text-gray-200 font-medium">{registryItem.name}</div>
        <div className="text-xs text-gray-600 font-mono mt-1">{selectedComponent.id}</div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 block">Label</label>
          <input
            type="text"
            value={selectedComponent.properties.label || ''}
            onChange={(e) => handlePropChange('label', e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Load Properties */}
        {isLoad && (
            <div className="p-3 bg-gray-900 rounded border border-gray-700 space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Electrical Load</div>
                
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Power (Watts)</label>
                    <input
                        type="number"
                        min="0"
                        value={selectedComponent.properties.powerW || 0}
                        onChange={(e) => handlePropChange('powerW', parseFloat(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="text-gray-500 block">Current</span>
                        <span className="text-green-400 font-mono text-lg">
                            {loadData?.[selectedComponent.id]?.currentA.toFixed(2) || '0.00'} A
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Resistance</span>
                        <span className="text-gray-300 font-mono text-lg">
                            {loadData?.[selectedComponent.id]?.resistance.toFixed(0) || '∞'} Ω
                        </span>
                    </div>
                </div>
                
                <div className={`text-xs font-bold ${loadData?.[selectedComponent.id]?.isPowered ? 'text-green-500' : 'text-gray-500'}`}>
                    STATUS: {loadData?.[selectedComponent.id]?.isPowered ? 'POWERED' : 'OFF'}
                </div>
            </div>
        )}

        {/* Breaker Load Info */}
        {(isBreaker || isRCCB) && (
             <div className="p-3 bg-gray-900 rounded border border-gray-700 space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Circuit Load</div>
                <div className="flex justify-between items-end">
                    <span className="text-gray-400 text-xs">Total Current</span>
                    <span className="text-yellow-400 font-mono text-xl">
                        {(deviceLoads?.[selectedComponent.id] || 0).toFixed(2)} A
                    </span>
                </div>
                
                {/* Overload Check */}
                {(() => {
                    const current = deviceLoads?.[selectedComponent.id] || 0;
                    const ratingStr = selectedComponent.properties.rating || "0";
                    const rating = parseFloat(ratingStr); // extracts 16 from "16A"
                    if (current > rating && !isNaN(rating) && rating > 0) {
                        return (
                            <div className="bg-red-900/50 border border-red-700 text-red-200 px-2 py-1 rounded text-xs mt-2 font-bold animate-pulse">
                                ⚠️ OVERLOAD WARNING ({current.toFixed(1)}A &gt; {rating}A)
                            </div>
                        );
                    }
                    return null;
                })()}
             </div>
        )}

        {/* Specific Properties based on Type */}
        {(isBreaker || isRCCB || selectedComponent.type === COMPONENT_TYPES.SWITCH) && (
           <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
              <span className="text-gray-200 text-sm">Switch State</span>
              <button
                onClick={() => {
                    let newState = !selectedComponent.properties.isOn;
                    let updates = { isOn: newState };
                    if (selectedComponent.properties.isTripped) {
                        updates.isTripped = false; 
                        updates.isOn = true; 
                    }
                    handlePropChange('isOn', newState);
                    if (selectedComponent.properties.isTripped) handlePropChange('isTripped', false);
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                    selectedComponent.properties.isOn 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}
              >
                {selectedComponent.properties.isTripped ? 'TRIPPED (RESET)' : (selectedComponent.properties.isOn ? 'ON' : 'OFF')}
              </button>
           </div>
        )}

        {selectedComponent.type === COMPONENT_TYPES.SUPPLY && (
           <div className="space-y-2">
               <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-gray-200 text-sm">Mains Power</span>
                  <button
                    onClick={() => handlePropChange('enabled', !selectedComponent.properties.enabled)}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                        selectedComponent.properties.enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {selectedComponent.properties.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
               </div>
               <div className="p-2 bg-gray-900 rounded border border-gray-700">
                   <div className="text-gray-400 text-xs">Total System Load</div>
                   <div className="text-yellow-400 font-mono text-xl">
                       {(deviceLoads?.['TOTAL_MAINS'] || 0).toFixed(2)} A
                   </div>
               </div>
           </div>
        )}
        
        {/* Socket Status Display */}
        {selectedComponent.type === COMPONENT_TYPES.SOCKET && (
            <div className="p-3 bg-gray-900 rounded border border-gray-700 space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Diagnostic</div>
                <StatusRow label="Phase" active={simulationState.socketStates[selectedComponent.id]?.hasPhase} />
                <StatusRow label="Neutral" active={simulationState.socketStates[selectedComponent.id]?.hasNeutral} color="blue" />
                <StatusRow label="Earth" active={simulationState.socketStates[selectedComponent.id]?.hasEarth} color="green" />
                
                <div className={`mt-2 pt-2 border-t border-gray-700 text-center font-mono text-xs ${
                    simulationState.socketStates[selectedComponent.id]?.status === 'UNSAFE_BYPASS' ? 'text-red-400 font-bold' : ''
                }`}>
                    {simulationState.socketStates[selectedComponent.id]?.status}
                </div>
                
                {simulationState.socketStates[selectedComponent.id]?.warning === 'NEUTRAL_BYPASS' && (
                    <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-900">
                        ⚠ Danger: Neutral bypasses RCCB! No leakage protection.
                    </div>
                )}
            </div>
        )}

        {/* Rating Field (for non-loads usually, but we keep generic if needed) */}
        {!isLoad && selectedComponent.properties.rating !== undefined && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400 block">Rating</label>
              <input
                type="text"
                value={selectedComponent.properties.rating || ''}
                onChange={(e) => handlePropChange('rating', e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-700">
        <button
          onClick={() => removeComponent(selectedComponent.id)}
          className="w-full py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-800 transition-colors"
        >
          Delete Component
        </button>
      </div>
    </div>
  );
};

const StatusRow = ({ label, active, color = 'red' }) => {
    let dotColor = 'bg-gray-600';
    if (active) {
        if (color === 'red') dotColor = 'bg-red-500';
        if (color === 'blue') dotColor = 'bg-blue-500';
        if (color === 'green') dotColor = 'bg-green-500';
    }

    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{label}</span>
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        </div>
    );
};

const EmptyPanel = () => (
  <div className="w-72 bg-gray-800 border-l border-gray-700 p-4 text-gray-500 text-sm">
    Select a component or wire to edit.
  </div>
);
