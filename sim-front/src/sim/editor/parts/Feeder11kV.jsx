import React from 'react';
import { Group, Rect, Text, Path, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Feeder11kV = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label } = properties;

  const togglePhase = (phase) => {
    const propKey = `phase${phase}`; // phaseR, phaseY, phaseB
    const currentVal = properties[propKey];
    // Default is true if undefined. So if undefined or true -> set false. If false -> set true.
    const newVal = currentVal === false; 
    
    updateComponent(id, {
      properties: { ...properties, [propKey]: newVal }
    });
  };

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={100} height={100} stroke="#FF4400" strokeWidth={2} offset={{ x: 50, y: 50 }} />
      )}

      {/* Main Body - Transmission Tower Design */}
      <Path
        data="M -20 40 L -10 -40 L 10 -40 L 20 40 Z"
        fill="#374151"
        stroke="#1F2937"
        strokeWidth={2}
      />
      
      {/* Cross Arms */}
      <Rect x={-35} y={-25} width={70} height={4} fill="#4B5563" />
      <Rect x={-25} y={0} width={50} height={4} fill="#4B5563" />

      {/* Insulators */}
      <Circle x={-30} y={-23} radius={4} fill="#9CA3AF" />
      <Circle x={30} y={-23} radius={4} fill="#9CA3AF" />
      <Circle x={-20} y={2} radius={4} fill="#9CA3AF" />
      <Circle x={20} y={2} radius={4} fill="#9CA3AF" />

      {/* Warning Triangle */}
      <Path
        data="M 0 -15 L 10 0 L -10 0 Z"
        fill="#FBBF24"
        stroke="#B45309"
        strokeWidth={1}
        y={15}
      />
      <Text
        text="⚡"
        fontSize={10}
        x={-4}
        y={10}
        fill="black"
      />

      {/* HV Label */}
      <Text
        text="11 kV"
        fontSize={10}
        fontStyle="bold"
        fill="#EF4444"
        y={-55}
        width={100}
        offsetX={50}
        align="center"
      />
      
      {/* Component Label */}
      <Text
        text={label}
        fontSize={10}
        fill="#9CA3AF"
        y={45}
        width={100}
        offsetX={50}
        align="center"
      />

      {/* Phase Control Switches */}
      <Group y={16}>
        {/* R Phase Button */}
        <Group 
            x={-30} 
            onClick={(e) => { e.cancelBubble = true; togglePhase('R'); }}
            onMouseEnter={() => document.body.style.cursor = 'pointer'}
            onMouseLeave={() => document.body.style.cursor = 'default'}
        >
            <Circle radius={5} fill={properties.phaseR !== false ? '#EF4444' : '#374151'} stroke="black" strokeWidth={1} />
            <Text text="R" fontSize={6} fill="white" x={-2} y={-3} />
        </Group>

        {/* Y Phase Button */}
        <Group 
            x={-10} 
            onClick={(e) => { e.cancelBubble = true; togglePhase('Y'); }}
            onMouseEnter={() => document.body.style.cursor = 'pointer'}
            onMouseLeave={() => document.body.style.cursor = 'default'}
        >
            <Circle radius={5} fill={properties.phaseY !== false ? '#F59E0B' : '#374151'} stroke="black" strokeWidth={1} />
            <Text text="Y" fontSize={6} fill="black" x={-2} y={-3} />
        </Group>

        {/* B Phase Button */}
        <Group 
            x={10} 
            onClick={(e) => { e.cancelBubble = true; togglePhase('B'); }}
            onMouseEnter={() => document.body.style.cursor = 'pointer'}
            onMouseLeave={() => document.body.style.cursor = 'default'}
        >
            <Circle radius={5} fill={properties.phaseB !== false ? '#3B82F6' : '#374151'} stroke="black" strokeWidth={1} />
            <Text text="B" fontSize={6} fill="white" x={-2} y={-3} />
        </Group>
      </Group>

      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        // For Feeder, terminals are sources, always energized if enabled
        // Check specific phase for R, Y, B terminals
        let isEnergized = properties.enabled;
        if (t.id === 'R') isEnergized = isEnergized && (properties.phaseR !== false);
        if (t.id === 'Y') isEnergized = isEnergized && (properties.phaseY !== false);
        if (t.id === 'B') isEnergized = isEnergized && (properties.phaseB !== false);

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
