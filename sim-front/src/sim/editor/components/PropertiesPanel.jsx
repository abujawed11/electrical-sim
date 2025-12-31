import React from 'react';
import { useEditorStore } from '../store';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';
import { COMPONENT_TYPES, LOAD_TYPES } from '../types';

export const PropertiesPanel = () => {
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const components = useEditorStore((state) => state.components);
  const wires = useEditorStore((state) => state.wires);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const deleteWire = useEditorStore((state) => state.deleteWire);
  const simulationState = useEditorStore((state) => state.simulationState);
  const energyByMeterKWh = useEditorStore((state) => state.energyByMeterKWh);
  const energyBy3PMeterKWh = useEditorStore((state) => state.energyBy3PMeterKWh);
  const resetMeterEnergy = useEditorStore((state) => state.resetMeterEnergy);
  const reset3PMeterEnergy = useEditorStore((state) => state.reset3PMeterEnergy);

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

  const isLoad = [COMPONENT_TYPES.LAMP, COMPONENT_TYPES.GENERIC_LOAD, COMPONENT_TYPES.FAN, COMPONENT_TYPES.AC, COMPONENT_TYPES.HEATER, COMPONENT_TYPES.GEYSER, COMPONENT_TYPES.LOAD_3P_BALANCED].includes(selectedComponent.type);
  const isBreaker = selectedComponent.type === COMPONENT_TYPES.MCB || selectedComponent.type === COMPONENT_TYPES.RCBO || selectedComponent.type === COMPONENT_TYPES.MCB_3P;
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
                
                {selectedComponent.type === COMPONENT_TYPES.LOAD_3P_BALANCED ? (
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Power (kW)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedComponent.properties.powerKW || 0}
                            onChange={(e) => handlePropChange('powerKW', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                ) : (
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
                )}

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Power Factor</label>
                        <input
                            type="number"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={selectedComponent.properties.powerFactor || 1.0}
                            onChange={(e) => handlePropChange('powerFactor', parseFloat(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Type</label>
                        <select
                            value={selectedComponent.properties.loadType || LOAD_TYPES.RESISTIVE}
                            onChange={(e) => handlePropChange('loadType', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                        >
                            {Object.values(LOAD_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-700">
                    <div>
                        <span className="text-gray-500 block">Current (I)</span>
                        <span className="text-green-400 font-mono text-lg">
                            {loadData?.[selectedComponent.id]?.currentA.toFixed(2) || '0.00'} A
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Apparent (S)</span>
                        <span className="text-yellow-400 font-mono">
                            {loadData?.[selectedComponent.id]?.apparentVA.toFixed(0) || '0'} VA
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Reactive (Q)</span>
                        <span className="text-blue-400 font-mono">
                            {loadData?.[selectedComponent.id]?.reactiveVAR.toFixed(0) || '0'} VAR
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
                        {(deviceLoads?.[selectedComponent.id]?.currentA || 0).toFixed(2)} A
                    </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>P: {(deviceLoads?.[selectedComponent.id]?.P || 0).toFixed(0)} W</div>
                    <div>S: {(deviceLoads?.[selectedComponent.id]?.S || 0).toFixed(0)} VA</div>
                </div>

                {/* Overload Check */}
                {(() => {
                    const current = deviceLoads?.[selectedComponent.id]?.currentA || 0;
                    const ratingStr = selectedComponent.properties.rating || "0";
                    const rating = parseFloat(ratingStr); 
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
        {(isBreaker || isRCCB || selectedComponent.type === COMPONENT_TYPES.SWITCH || selectedComponent.type === COMPONENT_TYPES.MCB_3P || selectedComponent.type === COMPONENT_TYPES.DC_MCB) && (
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

        {(selectedComponent.type === COMPONENT_TYPES.SUPPLY || selectedComponent.type === COMPONENT_TYPES.SUPPLY_3P) && (
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
               {selectedComponent.type === COMPONENT_TYPES.SUPPLY_3P && (
                   <div className="space-y-1">
                       <label className="text-xs text-gray-400 block">Voltage (Phase-Phase)</label>
                       <input
                           type="number"
                           value={selectedComponent.properties.voltage || 415}
                           onChange={(e) => handlePropChange('voltage', parseFloat(e.target.value))}
                           className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                       />
                   </div>
               )}
               <div className="p-2 bg-gray-900 rounded border border-gray-700">
                   <div className="text-gray-400 text-xs">Total System Load</div>
                   <div className="text-yellow-400 font-mono text-xl">
                       {(deviceLoads?.['TOTAL_MAINS']?.currentA || 0).toFixed(2)} A
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-1">
                        <div>{(deviceLoads?.['TOTAL_MAINS']?.P || 0).toFixed(0)} W</div>
                        <div>{(deviceLoads?.['TOTAL_MAINS']?.S || 0).toFixed(0)} VA</div>
                   </div>
               </div>
           </div>
        )}
        
        {(selectedComponent.type === COMPONENT_TYPES.METER || selectedComponent.type === COMPONENT_TYPES.METER_3P) && (
            <div className="space-y-3">
                <div className="p-2 bg-gray-900 rounded border border-gray-700">
                    <div className="text-gray-400 text-xs">This Meter Reading</div>
                    <div className="text-yellow-400 font-mono text-xl">
                        {selectedComponent.type === COMPONENT_TYPES.METER
                            ? ((energyByMeterKWh?.[selectedComponent.id] ?? 0).toFixed(3))
                            : ((energyBy3PMeterKWh?.[selectedComponent.id] ?? 0).toFixed(3))
                        } kWh
                    </div>
                    <button
                        onClick={() => {
                            if (selectedComponent.type === COMPONENT_TYPES.METER) resetMeterEnergy(selectedComponent.id);
                            else reset3PMeterEnergy(selectedComponent.id);
                        }}
                        className="mt-2 w-full py-2 bg-yellow-700/40 hover:bg-yellow-700 text-yellow-100 rounded border border-yellow-600 transition-colors text-xs font-bold"
                        title="Reset only this meter"
                    >
                        Reset This Meter
                    </button>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Rate per Unit (₹/kWh)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={selectedComponent.properties.ratePerUnit || 10}
                        onChange={(e) => handlePropChange('ratePerUnit', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                </div>
            </div>
        )}

        {/* Solar Panel Properties */}
        {selectedComponent.type === COMPONENT_TYPES.SOLAR_PANEL && (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-gray-200 text-sm">Panel Status</span>
                  <button
                    onClick={() => handlePropChange('enabled', !selectedComponent.properties.enabled)}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                        selectedComponent.properties.enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {selectedComponent.properties.enabled ? 'ACTIVE' : 'COVERED'}
                  </button>
               </div>
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Rated Power (W)</label>
                   <input type="number" min="0" value={selectedComponent.properties.powerW} onChange={(e) => handlePropChange('powerW', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>
               <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                       <label className="text-xs text-gray-400 block">Voc (V)</label>
                       <input type="number" min="0" value={selectedComponent.properties.voc} onChange={(e) => handlePropChange('voc', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                   </div>
                   <div className="space-y-1">
                       <label className="text-xs text-gray-400 block">Vmp (V)</label>
                       <input type="number" min="0" value={selectedComponent.properties.vmp} onChange={(e) => handlePropChange('vmp', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                   </div>
               </div>
            </div>
        )}

        {/* Battery Properties */}
        {selectedComponent.type === COMPONENT_TYPES.BATTERY && (
            <div className="space-y-3">
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">System Voltage (V)</label>
                   <input type="number" min="0" value={selectedComponent.properties.voltage} onChange={(e) => handlePropChange('voltage', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Capacity (Ah)</label>
                   <input type="number" min="0" value={selectedComponent.properties.capacityAh} onChange={(e) => handlePropChange('capacityAh', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">State of Charge (%)</label>
                   <input
                       type="number"
                       min="0"
                       max="100"
                       value={Math.round(((selectedComponent.properties.socAh || 0) / Math.max(1e-6, (selectedComponent.properties.capacityAh || 0))) * 100)}
                       onChange={(e) => {
                           const capAh = Number(selectedComponent.properties.capacityAh || 0);
                           const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                           handlePropChange('socAh', capAh * (pct / 100));
                       }}
                       className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                   />
               </div>
               <div className="p-2 bg-gray-900 rounded border border-gray-700">
                   <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-xs">State of Charge</span>
                        <button onClick={() => handlePropChange('socAh', selectedComponent.properties.capacityAh)} className="text-[10px] bg-gray-700 px-1 rounded text-blue-300 hover:bg-gray-600">RESET</button>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (selectedComponent.properties.socAh / selectedComponent.properties.capacityAh)*100)}%` }} />
                   </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">{Math.round(selectedComponent.properties.socAh)} Ah</span>
                        <span className="text-xs text-white font-mono">{selectedComponent.properties.terminalVoltage ? selectedComponent.properties.terminalVoltage.toFixed(2) + 'V' : ''}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                       {selectedComponent.properties.isCharging ? 'CHARGING' : (selectedComponent.properties.isDischarging ? 'DISCHARGING' : 'IDLE')}
                   </div>
                </div>
             </div>
         )}

        {/* Solar Controller Properties */}
        {selectedComponent.type === COMPONENT_TYPES.SOLAR_CONTROLLER && (
            <div className="space-y-3">
               <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Max Current Rating (A)</label>
                    <input type="number" min="0" value={selectedComponent.properties.ratingA} onChange={(e) => handlePropChange('ratingA', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Efficiency (0.0 - 1.0)</label>
                    <input type="number" min="0" max="1" step="0.01" value={selectedComponent.properties.efficiency} onChange={(e) => handlePropChange('efficiency', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Common Negative (PV- ↔ BAT-)</label>
                    <button
                        onClick={() => handlePropChange('commonNegative', !selectedComponent.properties.commonNegative)}
                        className={`w-full px-3 py-2 rounded text-xs font-bold border transition-colors ${
                            selectedComponent.properties.commonNegative
                            ? 'bg-green-700/40 text-green-200 border-green-800'
                            : 'bg-gray-700 text-gray-200 border-gray-600'
                        }`}
                    >
                        {selectedComponent.properties.commonNegative ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>
                <div className="p-2 bg-gray-900 rounded border border-gray-700">
                    <div className="text-gray-400 text-xs uppercase font-bold mb-2">Live Metrics</div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="text-gray-400">Mode</div>
                        <div className={`text-right font-mono ${selectedComponent.properties.isCharging ? 'text-green-400' : 'text-gray-200'}`}>
                            {selectedComponent.properties.mode || (selectedComponent.properties.isCharging ? 'CHARGING' : 'IDLE')}
                        </div>

                        <div className="text-gray-400">PV Input</div>
                        <div className="text-right font-mono text-yellow-300">
                            {Math.round(selectedComponent.properties.pvInputW || selectedComponent.properties.inputPowerW || 0)} W
                        </div>

                        <div className="text-gray-400">Charge Power</div>
                        <div className="text-right font-mono text-green-300">
                            {Math.round(selectedComponent.properties.chargingW || 0)} W
                        </div>

                        <div className="text-gray-400">Charge Current</div>
                        <div className="text-right font-mono text-green-200">
                            {(Number(selectedComponent.properties.chargingA || 0)).toFixed(2)} A
                        </div>

                        <div className="text-gray-400">Avg Battery V</div>
                        <div className="text-right font-mono text-gray-200">
                            {(Number(selectedComponent.properties.avgBatteryV || 0)).toFixed(2)} V
                        </div>

                        <div className="text-gray-400">MPPT Limit</div>
                        <div className="text-right font-mono text-gray-200">
                            {Math.round(selectedComponent.properties.mpptLimitW || 0)} W
                        </div>

                        <div className="text-gray-400">Efficiency Used</div>
                        <div className="text-right font-mono text-gray-200">
                            {Math.round((Number(selectedComponent.properties.efficiencyUsed ?? selectedComponent.properties.efficiency ?? 0) * 100))}%
                        </div>

                        <div className="text-gray-400">Panels</div>
                        <div className="text-right font-mono text-gray-200">
                            {Number(selectedComponent.properties.connectedPanels || 0)}
                        </div>

                        <div className="text-gray-400">Batteries</div>
                        <div className="text-right font-mono text-gray-200">
                            {Number(selectedComponent.properties.connectedBatteries || 0)}
                        </div>
                    </div>

                    {selectedComponent.properties.lastTickReason && (
                        <div className="mt-2 text-[10px] text-gray-500 font-mono">
                            {selectedComponent.properties.lastTickReason}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Solar Inverter Properties (External Battery) */}
        {selectedComponent.type === COMPONENT_TYPES.SOLAR_INVERTER && (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-gray-200 text-sm">Solar Inverter</span>
                    <button
                        onClick={() => handlePropChange('enabled', !selectedComponent.properties.enabled)}
                        className={`px-3 py-1 rounded text-xs font-bold ${
                            selectedComponent.properties.enabled
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                    >
                        {selectedComponent.properties.enabled ? 'ON' : 'OFF'}
                    </button>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Bypass Mode</label>
                    <button
                        onClick={() => handlePropChange('isBypassMode', !selectedComponent.properties.isBypassMode)}
                        className={`w-full px-3 py-2 rounded text-xs font-bold border transition-colors ${
                            selectedComponent.properties.isBypassMode
                            ? 'bg-blue-700/40 text-blue-200 border-blue-800'
                            : 'bg-gray-700 text-gray-200 border-gray-600'
                        }`}
                    >
                        {selectedComponent.properties.isBypassMode ? 'BYPASS' : 'INVERTER'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Efficiency</label>
                        <input
                            type="number"
                            min="0.5"
                            max="1"
                            step="0.01"
                            value={selectedComponent.properties.efficiency ?? 0.9}
                            onChange={(e) => handlePropChange('efficiency', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Rated W</label>
                        <input
                            type="number"
                            min="0"
                            value={selectedComponent.properties.ratedW ?? 1000}
                            onChange={(e) => handlePropChange('ratedW', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Surge W</label>
                        <input
                            type="number"
                            min="0"
                            value={selectedComponent.properties.surgeW ?? 2000}
                            onChange={(e) => handlePropChange('surgeW', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Surge Sec</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedComponent.properties.surgeSec ?? 2}
                            onChange={(e) => handlePropChange('surgeSec', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block">Trip Delay Sec</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedComponent.properties.overloadDelaySec ?? 1}
                            onChange={(e) => handlePropChange('overloadDelaySec', parseFloat(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                        />
                    </div>
                </div>

                <div className="p-2 bg-gray-900 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-400 text-xs uppercase font-bold">Live Metrics</div>
                        <button
                            onClick={() => {
                                handlePropChange('isTripped', false);
                                handlePropChange('overloadTimerSec', 0);
                            }}
                            className="text-[10px] bg-gray-700 px-2 py-1 rounded text-blue-300 hover:bg-gray-600"
                        >
                            RESET TRIP
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="text-gray-400">Status</div>
                        <div className="text-right font-mono text-gray-200">{selectedComponent.properties.status || 'OFF'}</div>

                        <div className="text-gray-400">Tripped</div>
                        <div className="text-right font-mono text-gray-200">{selectedComponent.properties.isTripped ? 'YES' : 'NO'}</div>

                        <div className="text-gray-400">Overload</div>
                        <div className="text-right font-mono text-gray-200">
                            {selectedComponent.properties.overloadActive ? `${(selectedComponent.properties.overloadTimerSec || 0).toFixed(1)}s` : 'NO'}
                        </div>

                        <div className="text-gray-400">Can Invert</div>
                        <div className="text-right font-mono text-gray-200">{selectedComponent.properties.canInvert === false ? 'NO' : 'YES'}</div>

                        <div className="text-gray-400">Load</div>
                        <div className="text-right font-mono text-yellow-300">{Math.round(selectedComponent.properties.loadW || 0)} W</div>

                        <div className="text-gray-400">Load Current</div>
                        <div className="text-right font-mono text-yellow-200">{(Number(selectedComponent.properties.loadA || 0)).toFixed(2)} A</div>

                        <div className="text-gray-400">Output</div>
                        <div className="text-right font-mono text-green-300">{Math.round(selectedComponent.properties.outputW || 0)} W</div>

                        <div className="text-gray-400">Output Current</div>
                        <div className="text-right font-mono text-green-200">{(Number(selectedComponent.properties.outputA || 0)).toFixed(2)} A</div>

                        <div className="text-gray-400">DC Input</div>
                        <div className="text-right font-mono text-gray-200">{Math.round(selectedComponent.properties.dcInputW || 0)} W</div>

                        <div className="text-gray-400">Battery V</div>
                        <div className="text-right font-mono text-gray-200">{(Number(selectedComponent.properties.batteryVoltage || 0)).toFixed(2)} V</div>

                        <div className="text-gray-400">SOC</div>
                        <div className="text-right font-mono text-gray-200">{(Number(selectedComponent.properties.socPercent || 0)).toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        )}

        {/* Transformer Properties */}
        {selectedComponent.type === COMPONENT_TYPES.TRANSFORMER_3P && (
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">kVA Rating</label>
                    <input
                        type="number"
                        value={selectedComponent.properties.kVA || 100}
                        onChange={(e) => handlePropChange('kVA', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Primary Voltage (V)</label>
                    <input
                        type="number"
                        value={selectedComponent.properties.primaryVoltage || 11000}
                        onChange={(e) => handlePropChange('primaryVoltage', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Secondary Voltage (V)</label>
                    <input
                        type="number"
                        value={selectedComponent.properties.secondaryVoltage || 415}
                        onChange={(e) => handlePropChange('secondaryVoltage', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 block">Connection</label>
                    <select
                        value={selectedComponent.properties.connection || 'DELTA_STAR'}
                        onChange={(e) => handlePropChange('connection', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                    >
                        <option value="DELTA_STAR">Delta-Star (Dyn11)</option>
                        <option value="STAR_STAR">Star-Star</option>
                    </select>
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

        {selectedComponent.type === COMPONENT_TYPES.INVERTER && (
            <div className="space-y-3">
               <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-gray-200 text-sm">Inverter Power</span>
                  <button
                    onClick={() => handlePropChange('enabled', !selectedComponent.properties.enabled)}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                        selectedComponent.properties.enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {selectedComponent.properties.enabled ? 'ON' : 'OFF'}
                  </button>
               </div>
               
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Capacity (VA)</label>
                   <input type="number" value={selectedComponent.properties.capacityVA} onChange={(e) => handlePropChange('capacityVA', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>
               
               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Battery (Wh)</label>
                   <input type="number" value={selectedComponent.properties.batteryWh} onChange={(e) => handlePropChange('batteryWh', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>

               <div className="p-2 bg-gray-900 rounded border border-gray-700">
                   <div className="flex justify-between items-center mb-1">
                       <span className="text-gray-400 text-xs">State of Charge</span>
                       <button onClick={() => handlePropChange('socWh', selectedComponent.properties.batteryWh)} className="text-[10px] bg-gray-700 px-1 rounded text-blue-300 hover:bg-gray-600">RESET</button>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
                       <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (selectedComponent.properties.socWh / selectedComponent.properties.batteryWh)*100)}%` }} />
                   </div>
                   <div className="text-right text-xs text-gray-400 mt-1">{Math.round(selectedComponent.properties.socWh)} Wh</div>
               </div>

               <div className="p-2 bg-gray-900 rounded border border-gray-700">
                   <div className="text-gray-400 text-xs">Inverter Load</div>
                   <div className="text-yellow-400 font-mono text-xl">
                       {(deviceLoads?.[selectedComponent.id]?.currentA || 0).toFixed(2)} A
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-1">
                        <div>{(deviceLoads?.[selectedComponent.id]?.P || 0).toFixed(0)} W</div>
                        <div>{(deviceLoads?.[selectedComponent.id]?.S || 0).toFixed(0)} VA</div>
                   </div>
                   {selectedComponent.properties.isOverloaded && (
                       <div className="mt-1 text-red-500 font-bold text-xs animate-pulse">OVERLOADED!</div>
                   )}
               </div>

               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Charging Rate (W)</label>
                   <input type="number" value={selectedComponent.properties.chargingPowerW || 200} onChange={(e) => handlePropChange('chargingPowerW', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
               </div>

               <div className="space-y-1">
                   <label className="text-xs text-gray-400 block">Overload Shutdown Delay (seconds)</label>
                   <input type="number" value={(selectedComponent.properties.overloadShutdownDelayMs || 30000) / 1000} onChange={(e) => handlePropChange('overloadShutdownDelayMs', parseFloat(e.target.value) * 1000)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                   <p className="text-[10px] text-gray-500 italic">Time before inverter shuts down when overloaded</p>
               </div>
            </div>
        )}

        {selectedComponent.type === COMPONENT_TYPES.CHANGEOVER && (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-gray-200 text-sm">Operation Mode</span>
                  <button
                    onClick={() => handlePropChange('mode', selectedComponent.properties.mode === 'AUTO' ? 'MANUAL' : 'AUTO')}
                    className={`px-3 py-1 rounded text-xs font-bold ${
                        selectedComponent.properties.mode === 'AUTO'
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {selectedComponent.properties.mode || 'MANUAL'}
                  </button>
               </div>

                {selectedComponent.properties.mode === 'AUTO' ? (
                   <div className="space-y-2">
                       <div className="p-2 bg-gray-900 rounded border border-blue-900/50">
                           <div className="text-xs text-blue-400 font-bold mb-1">AUTO STATUS</div>
                           <div className="text-sm text-white font-mono">{selectedComponent.properties.autoStatus || 'Initializing...'}</div>
                           {selectedComponent.properties.position === 'OFF' && (
                               <div className="text-xs text-yellow-500 animate-pulse mt-1">Transferring...</div>
                           )}
                       </div>

                       <div className="space-y-1">
                           <label className="text-xs text-gray-400 block">Transfer Delay (ms)</label>
                           <input type="number" min="0" step="50" value={selectedComponent.properties.transferDelayMs || 200} onChange={(e) => handlePropChange('transferDelayMs', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white"/>
                       </div>
                       
                       <div className="flex items-center space-x-2">
                           <input type="checkbox" checked={selectedComponent.properties.upsMode || false} onChange={(e) => handlePropChange('upsMode', e.target.checked)} className="rounded bg-gray-700 border-gray-600"/>
                           <label className="text-xs text-gray-300">UPS Mode (Fast Transfer)</label>
                       </div>
                   </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 block">Position (Manual)</label>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handlePropChange('position', 'MAINS')}
                                className={`flex-1 py-2 rounded text-xs font-bold ${
                                    selectedComponent.properties.position === 'MAINS'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                }`}
                            >
                                MAINS
                            </button>
                            <button
                                onClick={() => handlePropChange('position', 'INVERTER')}
                                className={`flex-1 py-2 rounded text-xs font-bold ${
                                    selectedComponent.properties.position === 'INVERTER'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                }`}
                            >
                                INVERTER
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Rating Field */}
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
