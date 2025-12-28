import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const NeutralBar = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Auto-size based on terminal count (simplified for now fixed size in registry, but visual can adapt)
  const height = 140;

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
          width={30}
          height={height + 10}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 15, y: height / 2 + 5 }}
        />
      )}

      {/* Body */}
      <Rect
        width={20}
        height={height}
        fill="#93C5FD" // Light Blue for Neutral
        stroke="#1E40AF"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 10, y: height / 2 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Screws (visual) */}
      {registryItem.terminals.map((t, i) => (
         <Rect
            key={`screw-${i}`}
            x={-6}
            y={t.relY - 2}
            width={12}
            height={4}
            fill="#D1D5DB"
            cornerRadius={1}
            listening={false}
         />
      ))}

      {/* Label */}
      <Text
        text="NEUTRAL"
        fontSize={8}
        rotation={-90}
        x={5}
        y={40}
        fill="#1E3A8A"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        const isEnergized = simulationState.neutralSet.has(terminalIdStr);

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
