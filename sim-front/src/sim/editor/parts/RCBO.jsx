import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_REGISTRY } from './partRegistry';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const RCBO = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  const updateComponent = useEditorStore((state) => state.updateComponent);

  const { isOn, isTripped } = properties;

  const toggleSwitch = (e) => {
    e.cancelBubble = true;
    let newIsOn = !isOn;
    let newIsTripped = isTripped;
    
    if (newIsTripped && newIsOn) {
        newIsTripped = false; 
    }

    updateComponent(id, {
        properties: { ...properties, isOn: newIsOn, isTripped: newIsTripped }
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
          width={50}
          height={100}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 25, y: 50 }}
        />
      )}

      {/* Body */}
      <Rect
        width={42}
        height={92}
        fill="#F3F4F6"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 21, y: 46 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Toggle Handle - Blue for RCBO often? Or just standard black */}
      <Group onClick={toggleSwitch} onTap={toggleSwitch}>
          <Rect
            x={-10}
            y={-10}
            width={20}
            height={20}
            fill={isOn ? '#1E3A8A' : '#93C5FD'} // Blueish for RCBO distinction
            stroke="#1E40AF"
            strokeWidth={1}
            cornerRadius={2}
          />
          <Rect
            x={-10}
            y={isOn ? -10 : -2}
            width={20}
            height={12}
            fill="#172554"
            cornerRadius={2}
            listening={false}
          />
      </Group>

      {/* Label */}
      <Text
        text={properties.label || "RCBO"}
        fontSize={10}
        y={20}
        width={42}
        offsetX={21}
        align="center"
        fill="#1F2937"
        listening={false}
      />
      
      {/* Specs */}
      <Text
        text={`${properties.rating}`}
        fontSize={8}
        y={32}
        width={42}
        offsetX={21}
        align="center"
        fill="#6B7280"
        listening={false}
      />

      {/* State Text */}
      <Text
        text={isTripped ? 'TRIP' : (isOn ? 'ON' : 'OFF')}
        fontSize={9}
        fontStyle="bold"
        fill={isTripped ? '#EF4444' : (isOn ? '#10B981' : '#6B7280')}
        y={-30}
        width={42}
        offsetX={21}
        align="center"
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
