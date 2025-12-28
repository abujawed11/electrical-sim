import React from 'react';
import { Toolbox } from './Toolbox';
import { PropertiesPanel } from './PropertiesPanel';
import { CanvasStage } from './CanvasStage';
import { LessonPanel } from './LessonPanel';

export const EditorShell = () => {
  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden relative">
      <Toolbox />
      <div className="flex-1 relative">
         <CanvasStage />
         <LessonPanel />
      </div>
      <PropertiesPanel />
    </div>
  );
};