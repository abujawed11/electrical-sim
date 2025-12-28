import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const FaultLeakLE = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

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
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 20, y: 20 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Warning Symbol */}
      <Text
        text="⚠️"
        fontSize={20}
        y={-10}
        width={40}
        offsetX={20}
        align="center"
        fill="white"
        listening={false}
      />

      <Text
        text="LEAK L-E"
        fontSize={8}
        y={8}
        width={40}
        offsetX={20}
        align="center"
        fill="white"
        fontStyle="bold"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.kind === 'EARTH') isEnergized = simulationState.earthSet.has(terminalIdStr);

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
