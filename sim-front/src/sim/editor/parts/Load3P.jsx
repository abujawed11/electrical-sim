import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Load3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Check if powered (all 3 phases present)
  // This logic will be refined when we implement 3-phase network evaluation
  const isRunning = false; 

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
          width={100}
          height={100}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 50, y: 50 }}
        />
      )}

      {/* Body (Motor Shape) */}
      <Circle
        radius={40}
        fill="#374151"
        stroke="#111827"
        strokeWidth={2}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />
      
      {/* Shaft */}
      <Circle
        radius={5}
        fill="#9CA3AF"
        stroke="#4B5563"
        strokeWidth={1}
      />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={12}
        fontStyle="bold"
        fill="#E5E7EB"
        y={-55}
        width={100}
        offsetX={50}
        align="center"
        listening={false}
      />

      {/* Status */}
      <Text
        text={isRunning ? 'RUNNING' : 'OFF'}
        fontSize={10}
        fill={isRunning ? '#10B981' : '#6B7280'}
        y={50}
        width={100}
        offsetX={50}
        align="center"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = simulationState.livePhaseSet.has(terminalIdStr);

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
