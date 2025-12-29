import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Busbar3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  let barColor = '#EF4444'; // Default R
  if (type.includes('_Y')) barColor = '#F59E0B';
  if (type.includes('_B')) barColor = '#3B82F6';

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={40} height={150} stroke="#00A3FF" strokeWidth={2} offset={{ x: 20, y: 75 }} />
      )}
      <Rect
        width={30}
        height={140}
        fill={barColor}
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={2}
        offset={{ x: 15, y: 70 }}
        opacity={0.8}
      />
      <Text
        text={properties.label}
        fontSize={10}
        fontStyle="bold"
        fill="#E5E7EB"
        y={-85}
        width={30}
        offsetX={15}
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
