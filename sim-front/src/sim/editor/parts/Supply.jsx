import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Supply = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Determine energization for visuals (Supply is source, so always "hot" if enabled)
  const isEnabled = properties.enabled;

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
          height={80}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 35, y: 40 }}
        />
      )}

      {/* Body */}
      <Rect
        width={64}
        height={74}
        fill="#374151" // Dark gray
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 32, y: 37 }}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={12}
        fontStyle="bold"
        fill="#E5E7EB"
        y={-25}
        width={64}
        offsetX={32}
        align="center"
        listening={false}
      />

      {/* Status Indicator */}
      <Circle
        y={0}
        radius={4}
        fill={isEnabled ? '#10B981' : '#4B5563'} // Green if on
        stroke="#1F2937"
        strokeWidth={1}
      />
      <Text
        text={isEnabled ? 'ON' : 'OFF'}
        fontSize={10}
        fill={isEnabled ? '#10B981' : '#6B7280'}
        y={8}
        width={64}
        offsetX={32}
        align="center"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        // For Supply, terminals are sources, so they are "energized" if Supply is enabled
        // But for consistency with the rest of the app, we can rely on the simulation sets 
        // if we want, OR just locally force them since we know the logic.
        // Let's use the simulation set for consistency.
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.id === 'L') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.id === 'N') isEnergized = simulationState.neutralSet.has(terminalIdStr);
        if (t.id === 'E') isEnergized = simulationState.earthSet.has(terminalIdStr);

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
