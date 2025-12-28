import React from 'react';
import { useEditorStore } from '../store';
import { PART_REGISTRY } from '../parts/partRegistry';

export const PropertiesPanel = () => {
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const components = useEditorStore((state) => state.components);
  const wires = useEditorStore((state) => state.wires);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const deleteWire = useEditorStore((state) => state.deleteWire);

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

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col p-4">
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

        <div className="space-y-1">
          <label className="text-xs text-gray-400 block">Rating</label>
          <input
            type="text"
            value={selectedComponent.properties.rating || ''}
            onChange={(e) => handlePropChange('rating', e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
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

const EmptyPanel = () => (
  <div className="w-72 bg-gray-800 border-l border-gray-700 p-4 text-gray-500 text-sm">
    Select a component or wire to edit.
  </div>
);