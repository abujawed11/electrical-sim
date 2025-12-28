import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Heater = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  
  const loadInfo = simulationState.loadData?.[id];
  const isPowered = loadInfo?.isPowered;
  const currentA = loadInfo?.currentA || 0;

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
          width={70}
          height={70}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 35, y: 35 }}
        />
      )}

      {/* Body */}
      <Rect
        width={60}
        height={60}
        fill="#FECACA"
        stroke="#991B1B"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 30, y: 30 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Elements */}
      <Line points={[-20, -10, -10, -20, 0, -10, 10, -20, 20, -10]} stroke={isPowered ? "#EF4444" : "#991B1B"} strokeWidth={2} />
      <Line points={[-20, 0, -10, -10, 0, 0, 10, -10, 20, 0]} stroke={isPowered ? "#EF4444" : "#991B1B"} strokeWidth={2} />
      <Line points={[-20, 10, -10, 0, 0, 10, 10, 0, 20, 10]} stroke={isPowered ? "#EF4444" : "#991B1B"} strokeWidth={2} />

      {/* Stats */}
      <Text
        text={isPowered ? `${currentA.toFixed(2)}A` : "OFF"}
        fontSize={10}
        y={20}
        width={60}
        offsetX={30}
        align="center"
        fill="#7F1D1D"
        listening={false}
        fontStyle="bold"
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.kind === 'NEUTRAL') isEnergized = simulationState.neutralSet.has(terminalIdStr);
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
