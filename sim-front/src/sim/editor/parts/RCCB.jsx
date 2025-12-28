import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const RCCB = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  const updateComponent = useEditorStore((state) => state.updateComponent);

  const { isOn, isTripped } = properties;

  const toggleSwitch = (e) => {
    e.cancelBubble = true;
    // Cannot turn on if tripped (requires reset first? usually toggle handles reset in sim)
    // For now simple toggle. If tripped, turning ON resets trip.
    let newIsOn = !isOn;
    let newIsTripped = isTripped;
    
    if (newIsTripped && newIsOn) {
        newIsTripped = false; // Reset trip
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
          width={80}
          height={100}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 40, y: 50 }}
        />
      )}

      {/* Body */}
      <Rect
        width={72}
        height={92}
        fill="#E5E7EB"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 36, y: 46 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Toggle Handle */}
      <Group onClick={toggleSwitch} onTap={toggleSwitch}>
          <Rect
            x={-15}
            y={-10}
            width={30}
            height={20}
            fill={isOn ? '#1F2937' : '#9CA3AF'} 
            stroke="#4B5563"
            strokeWidth={1}
            cornerRadius={2}
          />
          {/* Position shift for visual toggle */}
          <Rect
            x={-15}
            y={isOn ? -10 : -2}
            width={30}
            height={12}
            fill="#111827"
            cornerRadius={2}
            listening={false}
          />
      </Group>

      {/* Label */}
      <Text
        text={properties.label || "RCCB"}
        fontSize={10}
        y={20}
        width={72}
        offsetX={36}
        align="center"
        fill="#1F2937"
        listening={false}
      />
      
      {/* Specs */}
      <Text
        text={`${properties.rating} ${properties.sensitivity}`}
        fontSize={8}
        y={32}
        width={72}
        offsetX={36}
        align="center"
        fill="#6B7280"
        listening={false}
      />

      {/* State Text */}
      <Text
        text={isTripped ? 'TRIPPED' : (isOn ? 'ON' : 'OFF')}
        fontSize={10}
        fontStyle="bold"
        fill={isTripped ? '#EF4444' : (isOn ? '#10B981' : '#6B7280')}
        y={-30}
        width={72}
        offsetX={36}
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
