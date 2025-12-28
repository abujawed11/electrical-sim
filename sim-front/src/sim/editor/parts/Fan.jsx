import React from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Fan = ({ id, type, x, y, isSelected, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);
  
  const loadInfo = simulationState.loadData?.[id];
  const isPowered = loadInfo?.isPowered;
  const currentA = loadInfo?.currentA || 0;

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
          width={60}
          height={60}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 30, y: 30 }}
        />
      )}

      {/* Body */}
      <Circle
        radius={25}
        fill="#DDD6FE"
        stroke="#4338CA"
        strokeWidth={1}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
      />
      
      {/* Blades (Visual) */}
      <Group rotation={isPowered ? 45 : 0}>
         <Rect x={-4} y={-20} width={8} height={40} fill="#818CF8" cornerRadius={4} />
         <Rect x={-20} y={-4} width={40} height={8} fill="#818CF8" cornerRadius={4} />
      </Group>

      {/* Stats */}
      <Text
        text={isPowered ? `${currentA.toFixed(2)}A` : "OFF"}
        fontSize={8}
        y={5}
        width={50}
        offsetX={25}
        align="center"
        fill="#374151"
        listening={false}
        fontStyle="bold"
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
