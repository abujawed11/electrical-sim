import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Busbar = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

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
        fill="#B45309" // Copper/Brown
        stroke="#78350F"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 10, y: height / 2 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Label */}
      <Text
        text="PHASE BUS"
        fontSize={8}
        rotation={-90}
        x={5}
        y={50}
        fill="#FFF7ED"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        const isEnergized = simulationState.livePhaseSet.has(terminalIdStr);

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
