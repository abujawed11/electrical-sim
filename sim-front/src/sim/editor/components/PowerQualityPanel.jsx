import React, { useState } from 'react';
import { useEditorStore } from '../store';

export const PowerQualityPanel = () => {
  const [expanded, setExpanded] = useState(false);

  const pqConfig = useEditorStore(state => state.pqConfig);
  const pqState = useEditorStore(state => state.pqState);
  const setPQConfig = useEditorStore(state => state.setPQConfig);
  const setPhaseStatus = useEditorStore(state => state.setPhaseStatus);

  if (!pqConfig) return null; // Safety

  const toggleEnabled = () => setPQConfig({ enabled: !pqConfig.enabled });

  // Manual phase control handlers
  const togglePhase = (phase) => {
      setPhaseStatus(phase, !pqState.phaseStatus[phase]);
  };

  return (
    <div className="bg-gray-800 rounded border border-gray-600 shadow-lg pointer-events-auto flex flex-col w-64 transition-all">
      {/* Header / Summary */}
      <div 
        className="p-2 flex items-center justify-between cursor-pointer hover:bg-gray-700 rounded-t"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full ${pqConfig.enabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`} />
           <span className="text-xs font-bold text-gray-200">Power Quality</span>
        </div>
        <div className="text-[10px] text-gray-400">
             {expanded ? '▼' : '▶'}
        </div>
      </div>

      {/* Expanded Controls */}
      {expanded && (
        <div className="p-3 border-t border-gray-600 space-y-3 bg-gray-900/50">
           
           {/* Master Switch */}
           <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Simulation Enabled</span>
              <button 
                 onClick={toggleEnabled}
                 className={`w-10 h-5 rounded-full relative transition-colors ${pqConfig.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${pqConfig.enabled ? 'left-6' : 'left-1'}`} />
              </button>
           </div>

           {pqConfig.enabled && (
             <>
               {/* Indicators */}
               <div className="grid grid-cols-3 gap-1">
                  <PhaseIndicator label="R" voltage={pqState.voltages.R} active={pqState.phaseStatus.R} />
                  <PhaseIndicator label="Y" voltage={pqState.voltages.Y} active={pqState.phaseStatus.Y} />
                  <PhaseIndicator label="B" voltage={pqState.voltages.B} active={pqState.phaseStatus.B} />
               </div>

               {/* Manual Phase Controls (Testing) */}
               <div className="space-y-1 pt-2 border-t border-gray-700">
                  <div className="text-[10px] text-gray-400 mb-1">Manual Phase Control (Testing)</div>
                  <div className="grid grid-cols-3 gap-1">
                     <button
                        onClick={() => togglePhase('R')}
                        className={`px-2 py-1 text-xs rounded ${pqState.phaseStatus.R ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                     >
                        R {pqState.phaseStatus.R ? 'ON' : 'OFF'}
                     </button>
                     <button
                        onClick={() => togglePhase('Y')}
                        className={`px-2 py-1 text-xs rounded ${pqState.phaseStatus.Y ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                     >
                        Y {pqState.phaseStatus.Y ? 'ON' : 'OFF'}
                     </button>
                     <button
                        onClick={() => togglePhase('B')}
                        className={`px-2 py-1 text-xs rounded ${pqState.phaseStatus.B ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                     >
                        B {pqState.phaseStatus.B ? 'ON' : 'OFF'}
                     </button>
                  </div>
               </div>

               {/* Toggles */}
               <div className="space-y-2 pt-2 border-t border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pqConfig.outageEnabled}
                        onChange={(e) => setPQConfig({ outageEnabled: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-xs text-gray-300">Random Outages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pqConfig.brownoutEnabled}
                        onChange={(e) => setPQConfig({ brownoutEnabled: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-xs text-gray-300">Brownouts / Sag</span>
                  </label>
               </div>

               {/* Sliders */}
               <div className="space-y-3 pt-2">
                   <div className="space-y-1">
                       <div className="flex justify-between text-[10px] text-gray-400">
                           <span>Base Voltage</span>
                           <span>{pqConfig.baseVoltage} V</span>
                       </div>
                       <input 
                           type="range" 
                           min="200" max="250" 
                           value={pqConfig.baseVoltage}
                           onChange={(e) => setPQConfig({ baseVoltage: Number(e.target.value) })}
                           className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                       />
                   </div>

                   {pqConfig.brownoutEnabled && (
                       <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-gray-400">
                               <span>Line Resistance (Sag)</span>
                               <span>{pqConfig.sagResistance} Ω</span>
                           </div>
                           <input 
                               type="range" 
                               min="0.1" max="2.0" step="0.1"
                               value={pqConfig.sagResistance}
                               onChange={(e) => setPQConfig({ sagResistance: Number(e.target.value) })}
                               className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                           />
                       </div>
                   )}

                    {pqConfig.outageEnabled && (
                       <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-gray-400">
                               <span>Outage Interval (Avg)</span>
                               <span>{pqConfig.outageMeanIntervalSec} s</span>
                           </div>
                           <input 
                               type="range" 
                               min="10" max="300" step="10"
                               value={pqConfig.outageMeanIntervalSec}
                               onChange={(e) => setPQConfig({ outageMeanIntervalSec: Number(e.target.value) })}
                               className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                           />
                       </div>
                   )}
               </div>
             </>
           )}
        </div>
      )}
    </div>
  );
};

const PhaseIndicator = ({ label, voltage, active }) => {
    // Color logic and status text
    let color = 'text-green-400';
    let status = '';
    if (!active) {
        color = 'text-red-500 font-bold';
        status = 'OUTAGE';
    } else if (voltage < 200) {
        color = 'text-orange-500';
        status = 'CRITICAL';
    } else if (voltage < 210) {
        color = 'text-yellow-400';
        status = 'LOW';
    } else if (voltage > 250) {
        color = 'text-red-400';
        status = 'HIGH';
    } else {
        status = 'NORMAL';
    }

    return (
        <div className="bg-gray-800 p-1 rounded border border-gray-700 flex flex-col items-center">
            <span className={`text-[10px] font-bold ${active ? 'text-gray-400' : 'text-red-500'}`}>{label}</span>
            <span className={`text-xs font-mono ${color}`}>
                {active ? Math.round(voltage) + 'V' : 'OFF'}
            </span>
            {active && status !== 'NORMAL' && (
                <span className={`text-[9px] ${color}`}>{status}</span>
            )}
        </div>
    );
};
