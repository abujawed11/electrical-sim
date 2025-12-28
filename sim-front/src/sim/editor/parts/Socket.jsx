import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Socket = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Get socket state
  const socketState = simulationState.socketStates[id] || { status: 'DEAD' };
  
  let ledColor = '#9CA3AF'; // DEAD / Default
  if (socketState.status === 'LIVE_OK') ledColor = '#10B981'; // Green
  else if (socketState.status === 'NO_NEUTRAL' || socketState.status === 'NO_EARTH') ledColor = '#F59E0B'; // Orange
  else if (socketState.status === 'NO_PHASE') ledColor = '#9CA3AF'; // Gray

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
        width={46}
        height={46}
        fill="#F3F4F6"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 23, y: 23 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Pin Holes (Visual - Type G ish) */}
      <Rect x={-3} y={-12} width={6} height={8} fill="#1F2937" />
      <Rect x={-10} y={5} width={6} height={6} fill="#1F2937" />
      <Rect x={4} y={5} width={6} height={6} fill="#1F2937" />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={14}
        width={46}
        offsetX={23}
        align="center"
        fill="#1F2937"
        listening={false}
      />

      {/* Status LED */}
      <Circle
        x={18}
        y={-18}
        radius={3}
        fill={ledColor}
        stroke="#374151"
        strokeWidth={0.5}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.id === 'L') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.id === 'N') isEnergized = simulationState.neutralSet.has(terminalIdStr);
        if (t.id === 'E') isEnergized = simulationState.earthSet.has(terminalIdStr);

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