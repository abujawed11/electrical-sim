import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const PhaseIndicator = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const hasR = simulationState.phaseRSet.has(`${id}:R`);
  const hasY = simulationState.phaseYSet.has(`${id}:Y`);
  const hasB = simulationState.phaseBSet.has(`${id}:B`);

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={100} height={60} stroke="#00A3FF" strokeWidth={2} offset={{ x: 50, y: 30 }} />
      )}
      <Rect
        width={90}
        height={50}
        fill="#1F2937"
        stroke="#374151"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 45, y: 25 }}
      />
      
      {/* Lights */}
      <Circle x={-30} y={-5} radius={6} fill={hasR ? '#EF4444' : '#4B5563'} stroke="#111827" strokeWidth={1} />
      <Circle x={-10} y={-5} radius={6} fill={hasY ? '#F59E0B' : '#4B5563'} stroke="#111827" strokeWidth={1} />
      <Circle x={10} y={-5} radius={6} fill={hasB ? '#3B82F6' : '#4B5563'} stroke="#111827" strokeWidth={1} />

      <Text text="R" fontSize={8} fill="#9CA3AF" x={-33} y={5} />
      <Text text="Y" fontSize={8} fill="#9CA3AF" x={-13} y={5} />
      <Text text="B" fontSize={8} fill="#9CA3AF" x={7} y={5} />

      <Text
        text={properties.label}
        fontSize={9}
        fontStyle="bold"
        fill="#E5E7EB"
        y={15}
        width={90}
        offsetX={45}
        align="center"
      />

      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE_R') isEnergized = hasR;
        if (t.kind === 'PHASE_Y') isEnergized = hasY;
        if (t.kind === 'PHASE_B') isEnergized = hasB;
        if (t.kind === 'NEUTRAL') isEnergized = simulationState.neutralSet.has(terminalIdStr);

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
