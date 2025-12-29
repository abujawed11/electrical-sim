import React from 'react';
import { Circle, Group, Text, Rect } from 'react-konva';
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

  // Default subtle colors for phase identification (even when not energized)
  if (terminal.kind === 'PHASE_R') {
    fillColor = '#7F1D1D'; // Dark red
    strokeColor = '#991B1B';
  }
  if (terminal.kind === 'PHASE_Y') {
    fillColor = '#78350F'; // Dark yellow/amber
    strokeColor = '#92400E';
  }
  if (terminal.kind === 'PHASE_B') {
    fillColor = '#1E3A8A'; // Dark blue
    strokeColor = '#1E40AF';
  }

  if (isEnergized) {
      fillColor = '#F59E0B'; // Bright Orange/Gold for live
      // Or we can be kind-specific if passed kind, but generic "hot" is good for feedback
      if (terminal.kind === 'NEUTRAL') fillColor = '#60A5FA'; // Blue
      if (terminal.kind === 'EARTH') fillColor = '#34D399'; // Green
      if (terminal.kind === 'PHASE') fillColor = '#EF4444'; // Red
      // 3-Phase specific colors (bright when energized)
      if (terminal.kind === 'PHASE_R') fillColor = '#EF4444'; // Bright Red
      if (terminal.kind === 'PHASE_Y') fillColor = '#FBBF24'; // Bright Yellow
      if (terminal.kind === 'PHASE_B') fillColor = '#3B82F6'; // Bright Blue
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

  // Smart Label Positioning: Avoid overlaps by considering terminal alignment
  const dist = 18;
  let lx = 0;
  let ly = 0;

  // Check for custom label offset (for alternating labels in tight spaces)
  if (terminal.labelOffsetY !== undefined) {
      ly = dist + terminal.labelOffsetY;
      lx = 0;
  } else if (terminal.relX === 0 && terminal.relY === 0) {
      ly = -dist; // Default above
  } else {
      const absX = Math.abs(terminal.relX);
      const absY = Math.abs(terminal.relY);

      // Determine if terminal is primarily on top/bottom or left/right
      if (absY > absX) {
          // Vertical side (top or bottom)
          ly = terminal.relY > 0 ? dist : -dist;
          lx = terminal.relX * 0.3; // Slight horizontal offset based on X position
      } else {
          // Horizontal side (left or right)
          lx = terminal.relX > 0 ? dist : -dist;
          ly = terminal.relY * 0.3; // Slight vertical offset based on Y position
      }
  }

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

      {/* Terminal Label with Background */}
      {terminal.label && (() => {
        // Color-code labels based on terminal kind
        let bgColor = 'rgba(50, 50, 50, 0.9)';
        let textColor = '#FFF';
        let borderColor = 'rgba(255, 255, 255, 0.4)';

        switch(terminal.kind) {
          case 'PHASE':
            bgColor = 'rgba(239, 68, 68, 0.9)'; // Red
            textColor = '#FFF';
            borderColor = 'rgba(255, 150, 150, 0.6)';
            break;
          case 'PHASE_R':
            bgColor = 'rgba(239, 68, 68, 0.9)'; // Red
            textColor = '#FFF';
            borderColor = 'rgba(255, 150, 150, 0.6)';
            break;
          case 'PHASE_Y':
            bgColor = 'rgba(251, 191, 36, 0.9)'; // Yellow
            textColor = '#000';
            borderColor = 'rgba(255, 220, 100, 0.6)';
            break;
          case 'PHASE_B':
            bgColor = 'rgba(59, 130, 246, 0.9)'; // Blue
            textColor = '#FFF';
            borderColor = 'rgba(150, 200, 255, 0.6)';
            break;
          case 'NEUTRAL':
            bgColor = 'rgba(59, 130, 246, 0.9)'; // Blue
            textColor = '#FFF';
            borderColor = 'rgba(150, 200, 255, 0.6)';
            break;
          case 'EARTH':
            bgColor = 'rgba(34, 197, 94, 0.9)'; // Green
            textColor = '#FFF';
            borderColor = 'rgba(150, 255, 150, 0.6)';
            break;
          default:
            bgColor = 'rgba(245, 158, 11, 0.9)'; // Amber
            textColor = '#000';
            borderColor = 'rgba(255, 200, 100, 0.6)';
        }

        return (
          <Group x={lx} y={ly} offsetX={18} offsetY={8}>
            {/* Background Rectangle */}
            <Rect
              width={36}
              height={16}
              fill={bgColor}
              cornerRadius={4}
              stroke={borderColor}
              strokeWidth={1.5}
              shadowColor="rgba(0, 0, 0, 0.5)"
              shadowBlur={4}
              shadowOffsetY={2}
              listening={false}
            />
            {/* Label Text */}
            <Text
              text={terminal.label}
              fontSize={11}
              fontStyle="bold"
              fontFamily="Arial, sans-serif"
              fill={textColor}
              align="center"
              verticalAlign="middle"
              width={36}
              height={16}
              listening={false}
            />
          </Group>
        );
      })()}
    </Group>
  );
};