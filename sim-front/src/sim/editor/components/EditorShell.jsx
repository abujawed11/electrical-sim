import React from 'react';
import { Toolbox } from './Toolbox';
import { PropertiesPanel } from './PropertiesPanel';
import { CanvasStage } from './CanvasStage';
import { LessonPanel } from './LessonPanel';
import { SimController } from './SimController';
import { useEditorStore } from '../store';

export const EditorShell = () => {
  const messages = useEditorStore((state) => state.messages);
  const dismissMessage = useEditorStore((state) => state.dismissMessage);
  const resetAllTrips = useEditorStore((state) => state.resetAllTrips);
  
  const mainsVoltage = useEditorStore((state) => state.mainsVoltage);
  const setMainsVoltage = useEditorStore((state) => state.setMainsVoltage);
  
  const simRunning = useEditorStore((state) => state.simRunning);
  const toggleSim = useEditorStore((state) => state.toggleSim);
  const timeScale = useEditorStore((state) => state.timeScale);
  const setTimeScale = useEditorStore((state) => state.setTimeScale);
  const resetEnergy = useEditorStore((state) => state.resetEnergy);

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
      <SimController />
      <Toolbox />
      
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
         {/* Top Right Controls Overlay */}
         <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
             
             {/* Voltage */}
             <div className="bg-gray-800 p-2 rounded border border-gray-600 flex items-center gap-2 shadow-lg pointer-events-auto">
                <label className="text-xs font-bold text-gray-400">Mains (V)</label>
                <input 
                    type="number" 
                    value={mainsVoltage} 
                    onChange={(e) => setMainsVoltage(e.target.value)}
                    className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
             </div>

             {/* Simulation Controls */}
             <div className="bg-gray-800 p-2 rounded border border-gray-600 flex items-center gap-2 shadow-lg pointer-events-auto">
                 <button 
                    onClick={toggleSim}
                    className={`w-8 h-8 flex items-center justify-center rounded border ${
                        simRunning 
                        ? 'bg-red-900/50 border-red-700 hover:bg-red-900 text-red-200' 
                        : 'bg-green-900/50 border-green-700 hover:bg-green-900 text-green-200'
                    }`}
                    title={simRunning ? "Pause Simulation" : "Run Simulation"}
                 >
                     {simRunning ? '⏸' : '▶'}
                 </button>

                 <select 
                    value={timeScale} 
                    onChange={(e) => setTimeScale(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                 >
                     <option value="1">1x Speed</option>
                     <option value="10">10x Speed</option>
                     <option value="60">60x (1min/s)</option>
                     <option value="360">360x (6min/s)</option>
                     <option value="3600">3600x (1hr/s)</option>
                 </select>

                 <button 
                    onClick={resetEnergy}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs border border-gray-500 text-gray-200"
                    title="Reset Energy Meter"
                 >
                    Reset kWh
                 </button>
             </div>
         </div>

         {/* Message Banner Area */}
         {messages.length > 0 && (
             <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col space-y-2 w-auto max-w-xl pointer-events-auto">
                 {messages.map(msg => (
                     <div 
                        key={msg.id} 
                        className={`px-4 py-3 rounded shadow-lg flex items-center justify-between space-x-4 border ${
                            msg.type === 'error' ? 'bg-red-900/90 border-red-700 text-white' : 'bg-blue-900/90 border-blue-700 text-white'
                        }`}
                     >
                         <span className="font-bold text-sm">{msg.text}</span>
                         <button 
                            onClick={() => dismissMessage(msg.id)}
                            className="text-white/70 hover:text-white"
                         >
                             ✕
                         </button>
                     </div>
                 ))}
                 
                 {messages.some(m => m.type === 'error') && (
                     <button 
                        onClick={resetAllTrips}
                        className="mx-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded shadow-lg text-sm border border-yellow-400"
                     >
                        RESET ALL TRIPS
                     </button>
                 )}
             </div>
         )}

         <CanvasStage />
         <LessonPanel />
      </div>
      
      <PropertiesPanel />
    </div>
  );
};
