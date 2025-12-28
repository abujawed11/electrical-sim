import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const GenericLoad = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  
  // Computed values from simulation state
  const loadInfo = simulationState.loadData?.[id];
  const currentA = loadInfo?.currentA || 0;
  const isPowered = loadInfo?.isPowered;

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
        fill="#4B5563"
        stroke="#1F2937"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 30, y: 30 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Label */}
      <Text
        text={properties.label || "Load"}
        fontSize={10}
        y={-20}
        width={60}
        offsetX={30}
        align="center"
        fill="#E5E7EB"
        listening={false}
      />

      {/* Stats */}
      <Text
        text={`${properties.powerW}W`}
        fontSize={10}
        fontStyle="bold"
        y={-5}
        width={60}
        offsetX={30}
        align="center"
        fill="#FBBF24"
        listening={false}
      />
      
      <Text
        text={isPowered ? `${currentA.toFixed(2)}A` : "OFF"}
        fontSize={10}
        y={10}
        width={60}
        offsetX={30}
        align="center"
        fill={isPowered ? "#34D399" : "#9CA3AF"}
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
