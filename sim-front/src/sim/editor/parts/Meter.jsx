import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Meter = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  
  // Energy Reading
  const energyKWh = useEditorStore((state) => state.energyByMeterKWh?.[id] ?? 0);
  const cost = energyKWh * (properties.ratePerUnit || 10);

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
          height={90}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 35, y: 45 }}
        />
      )}

      {/* Body */}
      <Rect
        width={64}
        height={84}
        fill="#4B5563"
        stroke="#1F2937"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 32, y: 42 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Screen */}
      <Rect
        x={-25}
        y={-30}
        width={50}
        height={30}
        fill="#D1D5DB"
        stroke="#9CA3AF"
        strokeWidth={1}
      />
      <Text
        text={`${energyKWh.toFixed(2)} kWh`}
        x={-22}
        y={-28}
        fontSize={9}
        fontFamily="monospace"
        fill="#374151"
        listening={false}
      />
      <Text
        text={`₹${cost.toFixed(2)}`}
        x={-22}
        y={-15}
        fontSize={10}
        fontFamily="monospace"
        fontStyle="bold"
        fill="#059669"
        listening={false}
      />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={10}
        width={64}
        offsetX={32}
        align="center"
        fill="#E5E7EB"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
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
