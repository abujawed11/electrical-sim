import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Transformer3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label, primaryVoltage, secondaryVoltage, connection } = properties;

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
          width={140}
          height={120}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 70, y: 60 }}
        />
      )}

      {/* Body */}
      <Rect
        width={130}
        height={110}
        fill="#4B5563"
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 65, y: 55 }}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Label */}
      <Text
        text={label}
        fontSize={12}
        fontStyle="bold"
        fill="#E5E7EB"
        y={-40}
        width={130}
        offsetX={65}
        align="center"
        listening={false}
      />

      {/* Info Text */}
      <Text
        text={`${primaryVoltage/1000}kV / ${secondaryVoltage}V`}
        fontSize={10}
        fill="#9CA3AF"
        y={-25}
        width={130}
        offsetX={65}
        align="center"
        listening={false}
      />
      
      <Text
        text={connection.replace('_', '-')}
        fontSize={9}
        fill="#FCD34D"
        y={35}
        width={130}
        offsetX={65}
        align="center"
        listening={false}
      />

      {/* Winding Symbol (Simplified) */}
      <Group y={0}>
          {/* Primary Coils */}
          <Circle x={-20} y={-10} radius={10} stroke="#EF4444" strokeWidth={2} />
          <Circle x={-20} y={5} radius={10} stroke="#EF4444" strokeWidth={2} />
          
          {/* Secondary Coils */}
          <Circle x={20} y={-10} radius={10} stroke="#3B82F6" strokeWidth={2} />
          <Circle x={20} y={5} radius={10} stroke="#3B82F6" strokeWidth={2} />

          {/* Core Lines */}
          <Line points={[0, -20, 0, 20]} stroke="#9CA3AF" strokeWidth={2} />
          <Line points={[-4, -20, -4, 20]} stroke="#9CA3AF" strokeWidth={2} />
      </Group>

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        // Placeholder energization logic
        let isEnergized = false; 
        if (t.kind.startsWith('PHASE')) {
             isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
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
