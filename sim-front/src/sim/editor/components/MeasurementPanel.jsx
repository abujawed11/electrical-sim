import React from 'react';
import { useEditorStore } from '../store';
import { Activity, Zap, MousePointer2 } from 'lucide-react';

export const MeasurementPanel = () => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const measurementResult = useEditorStore((state) => state.measurementResult);
  const probePoints = useEditorStore((state) => state.probePoints);
  const resetTool = useEditorStore((state) => state.resetTool);

  // Close with Esc is handled in CanvasStage generally, but we can add a button
  
  if (activeTool === 'IDLE') {
    return (
      <div className="absolute bottom-4 right-4 flex gap-2 z-50 pointer-events-auto">
        <button
          onClick={() => setActiveTool('VOLTMETER')}
          className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg border border-gray-600 transition-all hover:scale-105"
          title="Voltmeter (V)"
        >
          <Activity size={24} className="text-yellow-400" />
        </button>
        <button
          onClick={() => setActiveTool('AMMETER')}
          className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg border border-gray-600 transition-all hover:scale-105"
          title="Ammeter (A)"
        >
          <Zap size={24} className="text-cyan-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-auto flex flex-col items-end gap-3">
       
       {/* Result Display */}
       {measurementResult && (
         <div className="bg-gray-900/95 p-4 rounded-lg shadow-2xl border border-gray-600 text-right animate-in fade-in slide-in-from-bottom-4">
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                {measurementResult.type === 'VOLT' ? 'Voltage Reading' : 'Current Reading'}
            </div>
            <div className={`text-3xl font-mono font-bold ${measurementResult.type === 'VOLT' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                {measurementResult.val} <span className="text-lg">{measurementResult.unit}</span>
            </div>
         </div>
       )}

       {/* Active Tool Controls */}
       <div className="bg-gray-800 p-2 rounded-full shadow-lg border border-gray-600 flex items-center gap-2 pl-4">
          <span className="text-sm font-bold text-gray-300 mr-2 flex items-center gap-2">
             {activeTool === 'VOLTMETER' ? (
                 <>
                   <Activity size={16} className="text-yellow-400" />
                   <span>Voltmeter</span>
                   {probePoints.length === 0 && <span className="text-xs font-normal text-gray-500 ml-2">(Click Point A)</span>}
                   {probePoints.length === 1 && <span className="text-xs font-normal text-yellow-500/80 ml-2">(Click Point B)</span>}
                 </>
             ) : (
                 <>
                   <Zap size={16} className="text-cyan-400" />
                   <span>Ammeter</span>
                   <span className="text-xs font-normal text-gray-500 ml-2">(Click Wire/Comp)</span>
                 </>
             )}
          </span>
          
          <button
            onClick={resetTool}
            className="bg-red-900/80 hover:bg-red-800 text-red-100 p-2 rounded-full transition-colors"
            title="Exit Tool (Esc)"
          >
            <span className="font-bold text-xs px-1">✕</span>
          </button>
       </div>
    </div>
  );
};
