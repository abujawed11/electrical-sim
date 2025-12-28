import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const HumanBody = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
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
          width={60}
          height={80}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 30, y: 40 }}
        />
      )}

      {/* Body - Human Shape (Abstract) */}
      <Circle radius={15} y={-25} fill="#FCA5A5" stroke="#B91C1C" strokeWidth={1} />
      <Rect x={-10} y={-10} width={20} height={40} fill="#93C5FD" stroke="#1E3A8A" strokeWidth={1} cornerRadius={5} />
      
      {/* Label */}
      <Text
        text={`Human (${properties.resistanceOhms}Ω)`}
        fontSize={8}
        y={35}
        width={80}
        offsetX={40}
        align="center"
        fill="#374151"
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
