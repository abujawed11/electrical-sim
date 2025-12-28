import React from 'react';
import { Toolbox } from './Toolbox';
import { PropertiesPanel } from './PropertiesPanel';
import { CanvasStage } from './CanvasStage';

export const EditorShell = () => {
  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <Toolbox />
      <CanvasStage />
      <PropertiesPanel />
    </div>
  );
};
