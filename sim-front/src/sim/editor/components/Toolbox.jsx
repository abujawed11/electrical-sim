import React from 'react';
import { useEditorStore } from '../store';
import { COMPONENT_TYPES } from '../types';

export const Toolbox = () => {
  const addComponent = useEditorStore((state) => state.addComponent);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4">
      <h2 className="text-gray-200 font-bold mb-4 uppercase text-xs tracking-wider">Toolbox</h2>
      
      <div className="space-y-2">
        <ToolButton 
          label="Mains Supply" 
          onClick={() => addComponent(COMPONENT_TYPES.SUPPLY)} 
        />
        <ToolButton 
          label="MCB (16A)" 
          onClick={() => addComponent(COMPONENT_TYPES.MCB)} 
        />
        <ToolButton 
          label="Socket (13A)" 
          onClick={() => addComponent(COMPONENT_TYPES.SOCKET)} 
        />
      </div>
      
      <div className="mt-auto text-xs text-gray-500">
        <p>Pan: Drag empty space</p>
        <p>Zoom: Mouse wheel</p>
      </div>
    </div>
  );
};

const ToolButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors duration-200 border border-gray-600 hover:border-gray-500"
  >
    {label}
  </button>
);