import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Inverter = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label, capacityVA, batteryWh, socWh, enabled, isOverloaded, isCharging, status } = properties;
  const socPercent = Math.max(0, Math.min(100, (socWh / batteryWh) * 100));

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
          width={90}
          height={100}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 45, y: 50 }}
        />
      )}

      {/* Body */}
      <Rect
        width={84}
        height={94}
        fill="#1F2937" // Darker gray
        stroke={isOverloaded ? "#EF4444" : "#4B5563"}
        strokeWidth={2}
        cornerRadius={6}
        offset={{ x: 42, y: 47 }}
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
        y={-35}
        width={84}
        offsetX={42}
        align="center"
        listening={false}
      />

      {/* Battery SOC Bar */}
      <Group y={-10}>
          <Rect
            x={-30}
            y={0}
            width={60}
            height={10}
            stroke="#6B7280"
            strokeWidth={1}
            cornerRadius={2}
            fill="#374151"
          />
          <Rect
            x={-29}
            y={1}
            width={58 * (socPercent / 100)}
            height={8}
            fill={socPercent > 20 ? "#10B981" : "#EF4444"}
            cornerRadius={1}
          />

          {/* Charging Indicator - Lightning Bolt */}
          {isCharging && socPercent < 100 && (
            <Group x={32} y={1}>
              <Line
                points={[0, 0, -3, 4, -1, 4, -4, 8, 2, 3, 0, 3, 3, 0]}
                fill="#FCD34D"
                stroke="#F59E0B"
                strokeWidth={0.5}
                closed
              />
            </Group>
          )}

          <Text
            text={`${Math.round(socPercent)}%`}
            fontSize={9}
            fill="#D1D5DB"
            x={0}
            y={12}
            width={60}
            offsetX={30}
            align="center"
            listening={false}
          />

          {/* Charging Status Text */}
          {isCharging && socPercent < 100 && (
            <Text
              text="CHARGING"
              fontSize={7}
              fill="#FCD34D"
              x={0}
              y={22}
              width={60}
              offsetX={30}
              align="center"
              listening={false}
            />
          )}
      </Group>

      {/* Mode Badge */}
      <Group y={8}>
          <Rect
            x={-20}
            y={0}
            width={40}
            height={10}
            fill={status === 'Mains (Bypass)' ? '#3B82F6' : '#8B5CF6'}
            cornerRadius={2}
          />
          <Text
            text={status === 'Mains (Bypass)' ? 'BYPASS' : 'BATTERY'}
            fontSize={7}
            fontStyle="bold"
            fill="white"
            x={0}
            y={2}
            width={40}
            offsetX={20}
            align="center"
            listening={false}
          />
      </Group>

      {/* Status Indicators */}
      <Group y={28}>
          <Circle
            x={-15}
            y={0}
            radius={3}
            fill={enabled ? '#10B981' : '#4B5563'}
          />
          <Text
            text="ON"
            fontSize={8}
            fill="#9CA3AF"
            x={-15}
            y={6}
            offsetX={6}
            align="center"
          />

          <Circle
            x={15}
            y={0}
            radius={3}
            fill={isOverloaded ? '#EF4444' : '#4B5563'}
          />
          <Text
            text="OVLD"
            fontSize={8}
            fill="#9CA3AF"
            x={15}
            y={6}
            offsetX={10}
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
