import React from 'react';
import { useEditorStore } from '../store';
import { COMPONENT_TYPES } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

export const Toolbox = () => {
  const addComponent = useEditorStore((state) => state.addComponent);
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const allowedParts = useEditorStore((state) => state.allowedParts);
  const clearAll = useEditorStore((state) => state.clearAll);

  const handleClear = () => {
      if (window.confirm("Are you sure you want to clear the entire canvas? This action cannot be undone.")) {
          clearAll();
      }
  };

  const availableTypes = Object.values(COMPONENT_TYPES).filter(type => {
      if (mode === 'SANDBOX') return true;
      if (!allowedParts) return true; // Fallback
      return allowedParts.includes(type);
  });

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4 z-10">
      <div className="flex bg-gray-900 rounded p-1 mb-4">
          <button 
             className={`flex-1 py-1 text-xs font-bold rounded ${mode === 'SANDBOX' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
             onClick={() => setMode('SANDBOX')}
          >
              Sandbox
          </button>
          <button 
             className={`flex-1 py-1 text-xs font-bold rounded ${mode === 'GUIDED' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
             onClick={() => setMode('GUIDED')}
          >
              Guided
          </button>
      </div>

      <h2 className="text-gray-200 font-bold mb-4 uppercase text-xs tracking-wider">Toolbox</h2>
      
      <div className="space-y-2 overflow-y-auto flex-1">
        {availableTypes.map(type => {
            const registryItem = PART_REGISTRY[type];
            return (
                <ToolButton 
                  key={type}
                  label={registryItem.name} 
                  onClick={() => addComponent(type)} 
                />
            );
        })}
      </div>
      
      <button
        onClick={handleClear}
        className="mt-4 w-full py-2 bg-red-900/80 hover:bg-red-800 text-red-100 rounded text-sm font-bold border border-red-700 transition-colors"
      >
        Clear Canvas
      </button>

      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-2">
        <p>Pan: Drag empty space</p>
        <p>Zoom: Mouse wheel</p>
      </div>
    </div>
  );
};

const ToolButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors duration-200 border border-gray-600 hover:border-gray-500 text-sm"
  >
    {label}
  </button>
);
