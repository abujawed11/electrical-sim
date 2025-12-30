import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Isolator3P = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  const updateComponent = useEditorStore((state) => state.updateComponent);

  const { label, isOn } = properties;

  const toggleSwitch = (e) => {
      e.cancelBubble = true;
      updateComponent(id, {
          properties: { ...properties, isOn: !isOn }
      });
  };

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={90} height={100} stroke="#00A3FF" strokeWidth={2} offset={{ x: 45, y: 50 }} />
      )}
      
      {/* Body */}
      <Rect
        width={80}
        height={90}
        fill="#F3F4F6"
        stroke="#374151"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 40, y: 45 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Label */}
      <Text
        text={label}
        fontSize={10}
        fontStyle="bold"
        fill="#374151"
        y={-35}
        width={80}
        offsetX={40}
        align="center"
      />
      
      {/* Rotary Handle */}
       <Group onClick={toggleSwitch} onTap={toggleSwitch} y={0}>
          <Circle radius={18} fill="#1F2937" stroke="#000" strokeWidth={1} />
          <Rect 
            width={6} 
            height={32} 
            fill={isOn ? "#EF4444" : "#9CA3AF"} 
            offset={{x: 3, y: 16}} 
            rotation={isOn ? 0 : -90} 
            cornerRadius={2}
          />
      </Group>

      {/* State Text */}
      <Text
        text={isOn ? "ON" : "OFF"}
        fontSize={10}
        fill={isOn ? "#EF4444" : "#6B7280"}
        y={25}
        width={80}
        offsetX={40}
        align="center"
        fontStyle="bold"
      />

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE_R') isEnergized = simulationState.phaseRSet.has(terminalIdStr);
        if (t.kind === 'PHASE_Y') isEnergized = simulationState.phaseYSet.has(terminalIdStr);
        if (t.kind === 'PHASE_B') isEnergized = simulationState.phaseBSet.has(terminalIdStr);

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
