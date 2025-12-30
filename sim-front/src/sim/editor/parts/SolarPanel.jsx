import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const SolarPanel = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

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

      {/* Body - Solar Blue */}
      <Rect
        width={60}
        height={80}
        fill="#1e3a8a" // Dark Blue
        stroke="#1F2937"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 30, y: 40 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Grid Lines Visual */}
      <Rect width={50} height={1} fill="#60a5fa" x={-25} y={-20} />
      <Rect width={50} height={1} fill="#60a5fa" x={-25} y={0} />
      <Rect width={50} height={1} fill="#60a5fa" x={-25} y={20} />
      <Rect width={1} height={70} fill="#60a5fa" x={0} y={-35} />

      {/* Label */}
      <Text
        text={properties.label || "PV"}
        fontSize={10}
        fontStyle="bold"
        y={-45}
        width={60}
        offsetX={30}
        align="center"
        fill="#93c5fd"
        listening={false}
      />

      <Text
        text={`${properties.powerW}W`}
        fontSize={10}
        y={28}
        width={60}
        offsetX={30}
        align="center"
        fill="#FBBF24"
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
