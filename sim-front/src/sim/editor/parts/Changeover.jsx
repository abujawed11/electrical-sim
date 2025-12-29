import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Changeover = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label, position, mode, autoStatus } = properties; // 'MAINS', 'INVERTER', or 'OFF'

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
          width={100}
          height={90}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 50, y: 45 }}
        />
      )}

      {/* Body */}
      <Rect
        width={90}
        height={80}
        fill="#374151"
        stroke="#111827"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 45, y: 40 }}
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
        y={-25}
        width={90}
        offsetX={45}
        align="center"
        listening={false}
      />
      
      {/* Auto Badge */}
      {mode === 'AUTO' && (
          <Group x={32} y={-35}>
              <Rect width={24} height={12} fill="#2563EB" cornerRadius={2} />
              <Text text="AUTO" fontSize={8} fill="white" x={2} y={2} />
          </Group>
      )}

      {/* Switch Visual */}
      <Group y={0}>
          {/* Output Center Points */}
          <Circle x={-5} y={20} radius={2} fill="#9CA3AF" />
          <Circle x={10} y={20} radius={2} fill="#9CA3AF" />

          {/* Lines based on position */}
          {position === 'MAINS' && (
              <>
                 <Line points={[-20, -20, -5, 20]} stroke="#10B981" strokeWidth={2} />
                 <Line points={[-5, -20, 10, 20]} stroke="#10B981" strokeWidth={2} />
              </>
          )} 
          {position === 'INVERTER' && (
              <>
                  <Line points={[20, -20, -5, 20]} stroke="#F59E0B" strokeWidth={2} />
                  <Line points={[35, -20, 10, 20]} stroke="#F59E0B" strokeWidth={2} />
              </>
          )}
          {/* OFF state shows no connection lines */}

          <Text 
            text={mode === 'AUTO' ? autoStatus : position} 
            fontSize={8} 
            fill={position === 'MAINS' ? '#10B981' : (position === 'INVERTER' ? '#F59E0B' : '#9CA3AF')} 
            y={-5} 
            width={90}
            offsetX={45}
            align="center"
          />
      </Group>

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
