import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const DCMCB = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const isOn = properties.isOn;

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
          height={70}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 25, y: 35 }}
        />
      )}

      {/* Body */}
      <Rect
        width={44}
        height={64}
        fill="#f3f4f6"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 22, y: 32 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Switch Toggle (Visual) */}
      <Group y={isOn ? -5 : 5}>
         <Rect
            x={-10}
            y={-5}
            width={20}
            height={10}
            fill={isOn ? '#10b981' : '#ef4444'} // Green ON / Red OFF
            cornerRadius={1}
        />
      </Group>

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={18}
        width={44}
        offsetX={22}
        align="center"
        fill="#1F2937"
        listening={false}
      />
      
      {/* Rating */}
       <Text
        text={`${properties.rating} DC`}
        fontSize={8}
        y={-28}
        width={44}
        offsetX={22}
        align="center"
        fill="#6B7280"
        listening={false}
      />
      
      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'DC_POS') isEnergized = simulationState.dcPosSet?.has(terminalIdStr);
        if (t.kind === 'DC_NEG') isEnergized = simulationState.dcNegSet?.has(terminalIdStr);

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
