import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const AC = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
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
          width={90}
          height={60}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 45, y: 30 }}
        />
      )}

      {/* Body */}
      <Rect
        width={80}
        height={50}
        fill="#E5E7EB"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 40, y: 25 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Vents */}
      <Rect x={-35} y={-10} width={70} height={4} fill="#9CA3AF" />
      <Rect x={-35} y={-4} width={70} height={4} fill="#9CA3AF" />

      {/* Label */}
      <Text
        text="AC"
        fontSize={10}
        fontStyle="bold"
        y={5}
        width={80}
        offsetX={40}
        align="center"
        fill="#374151"
        listening={false}
      />

      {/* Stats */}
      <Text
        text={isPowered ? `${currentA.toFixed(2)}A` : "OFF"}
        fontSize={10}
        y={15}
        width={80}
        offsetX={40}
        align="center"
        fill={isPowered ? "#10B981" : "#9CA3AF"}
        listening={false}
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
