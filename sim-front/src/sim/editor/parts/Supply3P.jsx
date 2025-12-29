import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Supply3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

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
          width={130}
          height={80}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 65, y: 40 }}
        />
      )}

      {/* Body */}
      <Rect
        width={120}
        height={74}
        fill="#374151" // Dark gray
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 60, y: 37 }}
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
        width={120}
        offsetX={60}
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
        width={120}
        offsetX={60}
        align="center"
        listening={false}
      />

      {/* Phase Indicators */}
      <Group y={-15}>
          <Circle x={-30} y={0} radius={3} fill="#EF4444" />
          <Circle x={-10} y={0} radius={3} fill="#F59E0B" />
          <Circle x={10} y={0} radius={3} fill="#3B82F6" />
      </Group>

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        // For now, we assume simple livePhaseSet checks.
        // We will need to update evaluateNetwork to properly populate R, Y, B sets.
        let isEnergized = false;
        // Temporary logic until evaluateNetwork is updated for 3-phase
        if (isEnabled) {
            isEnergized = true; 
        }

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
