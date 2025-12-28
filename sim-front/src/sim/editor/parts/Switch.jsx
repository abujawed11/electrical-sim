import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Switch = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const isOn = properties.isOn;
  const updateComponent = useEditorStore((state) => state.updateComponent);

  const toggleSwitch = (e) => {
      e.cancelBubble = true; // Prevent selecting component when toggling
      updateComponent(id, {
          properties: { ...properties, isOn: !isOn }
      });
  };

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
          width={40}
          height={40}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 20, y: 20 }}
        />
      )}

      {/* Body */}
      <Rect
        width={36}
        height={36}
        fill="#F3F4F6"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 18, y: 18 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Rocker - Clickable */}
      <Group onClick={toggleSwitch} onTap={toggleSwitch}>
          <Rect
            x={-8}
            y={-10}
            width={16}
            height={20}
            fill={isOn ? '#4B5563' : '#E5E7EB'}
            stroke="#9CA3AF"
            strokeWidth={1}
            cornerRadius={2}
          />
          <Rect
            x={-8}
            y={isOn ? -2 : -10}
            width={16}
            height={10}
            fill="#1F2937"
            cornerRadius={2}
            listening={false}
          />
      </Group>

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={22}
        width={40}
        offsetX={20}
        align="center"
        fill="#374151"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        // Usually phase, but we check generically
        const isEnergized = simulationState.livePhaseSet.has(terminalIdStr);

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
