import React from 'react';
import { Toolbox } from './Toolbox';
import { PropertiesPanel } from './PropertiesPanel';
import { CanvasStage } from './CanvasStage';
import { LessonPanel } from './LessonPanel';
import { useEditorStore } from '../store';

export const EditorShell = () => {
  const messages = useEditorStore((state) => state.messages);
  const dismissMessage = useEditorStore((state) => state.dismissMessage);
  const resetAllTrips = useEditorStore((state) => state.resetAllTrips);

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
      <Toolbox />
      
      <div className="flex-1 relative flex flex-col h-full overflow-hidden">
         {/* Message Banner Area */}
         {messages.length > 0 && (
             <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col space-y-2 w-auto max-w-xl">
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
                 
                 {/* Only show Reset button if there are errors (trips) */}
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
