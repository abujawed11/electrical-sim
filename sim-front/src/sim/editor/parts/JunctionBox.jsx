import React from 'react';
import { Group, Circle, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const JunctionBox = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Determine potential (color) based on what's connected?
  // We can check if any terminal is live.
  let isEnergizedPhase = false;
  let isEnergizedNeutral = false;
  let isEnergizedEarth = false;

  registryItem.terminals.forEach(t => {
      const tId = `${id}:${t.id}`;
      if (simulationState.livePhaseSet.has(tId)) isEnergizedPhase = true;
      if (simulationState.neutralSet.has(tId)) isEnergizedNeutral = true;
      if (simulationState.earthSet.has(tId)) isEnergizedEarth = true;
  });

  let bodyColor = "#9CA3AF"; // Gray
  if (isEnergizedPhase) bodyColor = "#FECACA"; // Reddish tint
  else if (isEnergizedNeutral) bodyColor = "#BFDBFE"; // Blueish tint
  else if (isEnergizedEarth) bodyColor = "#BBF7D0"; // Greenish tint

  return (
    <Group
      id={id}
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      {/* Selection Highlight */}
      {isSelected && (
        <Rect
          width={50}
          height={50}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 25, y: 25 }}
        />
      )}

      {/* Body */}
      <Rect
        width={40}
        height={40}
        fill={bodyColor}
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 20, y: 20 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Visual X */}
      <Rect x={-15} y={-1} width={30} height={2} fill="#6B7280" />
      <Rect x={-1} y={-15} width={2} height={30} fill="#6B7280" />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        // Energized if ANY of the sets contains it (since it's generic)
        let isEnergized = simulationState.livePhaseSet.has(terminalIdStr) || 
                          simulationState.neutralSet.has(terminalIdStr) || 
                          simulationState.earthSet.has(terminalIdStr);

        return (
          <Terminal
            key={t.id}
            componentId={id}
            terminal={t}
            isHovered={hoveredTerminal?.compId === id && hoveredTerminal?.terminalId === t.id}
            isEnergized={isEnergized}
            onMouseEnter={() => setHoveredTerminal({ compId: id, terminalId: t.id })}
            onMouseLeave={() => setHoveredTerminal(null)}
          />
        );
      })}
    </Group>
  );
};
