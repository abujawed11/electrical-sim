import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Meter3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={100} height={100} stroke="#00A3FF" strokeWidth={2} offset={{ x: 50, y: 50 }} />
      )}
      <Rect
        width={94}
        height={94}
        fill="#1F2937"
        stroke="#374151"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 47, y: 47 }}
      />
      <Rect width={70} height={30} fill="#064E3B" cornerRadius={2} offset={{ x: 35, y: 35 }} />
      <Text
        text="0000.0 kWh"
        fontSize={10}
        fontStyle="bold"
        fill="#10B981"
        y={-30}
        width={70}
        offsetX={35}
        align="center"
      />
      <Text
        text={properties.label}
        fontSize={10}
        fontStyle="bold"
        fill="#E5E7EB"
        y={10}
        width={94}
        offsetX={47}
        align="center"
      />
      <Line points={[-40, 35, 40, 35]} stroke="#374151" strokeWidth={1} />
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE_R') isEnergized = simulationState.phaseRSet.has(terminalIdStr);
        if (t.kind === 'PHASE_Y') isEnergized = simulationState.phaseYSet.has(terminalIdStr);
        if (t.kind === 'PHASE_B') isEnergized = simulationState.phaseBSet.has(terminalIdStr);
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
