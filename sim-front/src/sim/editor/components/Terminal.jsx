import React from 'react';
import { Circle, Group } from 'react-konva';
import { useEditorStore } from '../store';

export const Terminal = ({ componentId, terminal, isHovered, isEnergized, onMouseEnter, onMouseLeave }) => {
  const startWire = useEditorStore((state) => state.startWire);
  const completeWire = useEditorStore((state) => state.completeWire);
  const draftWire = useEditorStore((state) => state.draftWire);

  const isDrafting = !!draftWire;
  const isSource = isDrafting && draftWire.from.compId === componentId && draftWire.from.terminalId === terminal.id;
  
  // Validation visualization (basic)
  let fillColor = '#9CA3AF'; // Default gray
  let strokeColor = '#4B5563';
  let strokeWidth = 1;
  let radius = 4;

  if (isEnergized) {
      fillColor = '#F59E0B'; // Bright Orange/Gold for live
      // Or we can be kind-specific if passed kind, but generic "hot" is good for feedback
      if (terminal.kind === 'NEUTRAL') fillColor = '#60A5FA';
      if (terminal.kind === 'EARTH') fillColor = '#34D399';
      if (terminal.kind === 'PHASE') fillColor = '#EF4444';
  }

  if (isHovered) {
    fillColor = '#F3F4F6'; // Whiteish
    radius = 6;
  }

  if (isDrafting) {
    if (isSource) {
      fillColor = '#60A5FA'; // Source blue
    } else if (isHovered) {
        // Can we connect?
        // Ideally we check validity here to show green/red. 
        // For now, let's just show "active target" highlight.
        // We could pull store state or helper to check kinds.
        fillColor = '#34D399'; // Greenish
    }
  }

  const handleClick = (e) => {
    e.cancelBubble = true;
    if (isDrafting) {
      completeWire(componentId, terminal.id);
    } else {
      startWire(componentId, terminal.id);
    }
  };

  return (
    <Group
      x={terminal.relX}
      y={terminal.relY}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Hit Area - invisible larger circle */}
      <Circle radius={10} fill="transparent" />
      
      {/* Visual Terminal */}
      <Circle
        radius={radius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </Group>
  );
};
