import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const MCB3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label, isOn, isTripped, rating } = properties;

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={90} height={110} stroke="#00A3FF" strokeWidth={2} offset={{ x: 45, y: 55 }} />
      )}
      <Rect
        width={80}
        height={100}
        fill="#374151"
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 40, y: 50 }}
      />
      <Rect
        width={20}
        height={40}
        fill={isTripped ? '#EF4444' : (isOn ? '#10B981' : '#4B5563')}
        x={-10}
        y={-20}
        cornerRadius={2}
      />
      <Text
        text={label}
        fontSize={10}
        fontStyle="bold"
        fill="#E5E7EB"
        y={-40}
        width={80}
        offsetX={40}
        align="center"
      />
      <Text
        text={rating}
        fontSize={9}
        fill="#9CA3AF"
        y={25}
        width={80}
        offsetX={40}
        align="center"
      />
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE_R') isEnergized = simulationState.phaseRSet.has(terminalIdStr);
        if (t.kind === 'PHASE_Y') isEnergized = simulationState.phaseYSet.has(terminalIdStr);
        if (t.kind === 'PHASE_B') isEnergized = simulationState.phaseBSet.has(terminalIdStr);

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
