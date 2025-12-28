import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Socket = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);

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
          width={50}
          height={50}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 25, y: 25 }}
        />
      )}

      {/* Body */}
      <Rect
        width={46}
        height={46}
        fill="#F3F4F6"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 23, y: 23 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Pin Holes (Visual - Type G ish) */}
      <Rect x={-3} y={-12} width={6} height={8} fill="#1F2937" />
      <Rect x={-10} y={5} width={6} height={6} fill="#1F2937" />
      <Rect x={4} y={5} width={6} height={6} fill="#1F2937" />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={14}
        width={46}
        offsetX={23}
        align="center"
        fill="#1F2937"
        listening={false}
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => (
        <Terminal
          key={t.id}
          componentId={id}
          terminal={t}
          isHovered={hoveredTerminal?.compId === id && hoveredTerminal?.terminalId === t.id}
          onMouseEnter={() => setHoveredTerminal({ compId: id, terminalId: t.id })}
          onMouseLeave={() => setHoveredTerminal(null)}
        />
      ))}
    </Group>
  );
};
