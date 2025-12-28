import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Geyser = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
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

      {/* Tank Body */}
      <Rect
        width={50}
        height={60}
        fill="#E0F2FE"
        stroke="#0369A1"
        strokeWidth={2}
        cornerRadius={8}
        offset={{ x: 25, y: 30 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Heating Element Indicator */}
      <Circle
        x={0}
        y={-5}
        radius={8}
        fill={isPowered ? "#EF4444" : "#94A3B8"}
        stroke="#475569"
        strokeWidth={1}
      />

      {/* Water Level Indicator */}
      <Rect
        x={-18}
        y={-15}
        width={36}
        height={20}
        fill={isPowered ? "#BAE6FD" : "#CBD5E1"}
        stroke="#0369A1"
        strokeWidth={1}
      />

      {/* Temperature Indicator Lines */}
      {isPowered && (
        <>
          <Line points={[-8, -20, -8, -18]} stroke="#EF4444" strokeWidth={2} />
          <Line points={[0, -22, 0, -18]} stroke="#EF4444" strokeWidth={2} />
          <Line points={[8, -20, 8, -18]} stroke="#EF4444" strokeWidth={2} />
        </>
      )}

      {/* Stats */}
      <Text
        text={isPowered ? `${currentA.toFixed(2)}A` : "OFF"}
        fontSize={10}
        y={20}
        width={50}
        offsetX={25}
        align="center"
        fill="#0C4A6E"
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
