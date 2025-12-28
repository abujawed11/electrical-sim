import React from 'react';
import { Group, Circle, Rect, Text } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Lamp = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Check if lit: Needs Phase on L and Neutral on N
  const hasPhase = simulationState.livePhaseSet.has(`${id}:L`);
  const hasNeutral = simulationState.neutralSet.has(`${id}:N`);
  const isLit = hasPhase && hasNeutral;

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
          height={60}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 25, y: 30 }}
        />
      )}

      {/* Base */}
      <Rect
        x={-10}
        y={10}
        width={20}
        height={15}
        fill="#9CA3AF"
        stroke="#4B5563"
        strokeWidth={1}
      />

      {/* Bulb */}
      <Circle
        y={-5}
        radius={20}
        fill={isLit ? '#FCD34D' : '#F3F4F6'} // Yellow or White
        stroke="#D1D5DB"
        strokeWidth={1}
        shadowColor={isLit ? '#FCD34D' : 'transparent'}
        shadowBlur={20}
        shadowOpacity={0.8}
      />
      
      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={30}
        width={50}
        offsetX={25}
        align="center"
        fill="#E5E7EB"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.id === 'L') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.id === 'N') isEnergized = simulationState.neutralSet.has(terminalIdStr);

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
