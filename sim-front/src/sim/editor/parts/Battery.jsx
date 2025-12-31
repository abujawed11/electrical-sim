import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const Battery = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // SOC Visualization
  const capAh = Math.max(1e-6, Number(properties.capacityAh || 0));
  const socAh = Number(properties.socAh || 0);
  const socPct = (socAh / capAh) * 100;
  const isCharging = Boolean(properties.isCharging);
  
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
          height={70}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 35, y: 35 }}
        />
      )}

      {/* Body */}
      <Rect
        width={60}
        height={60}
        fill="#374151"
        stroke="#1F2937"
        strokeWidth={2}
        cornerRadius={4}
        offset={{ x: 30, y: 30 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      
      {/* Terminals Indicators */}
      <Text text="+" x={-20} y={-25} fontSize={14} fill="#ef4444" fontStyle="bold" />
      <Text text="-" x={14} y={-25} fontSize={14} fill="#3b82f6" fontStyle="bold" />

      {/* SOC Bar */}
      <Rect x={-20} y={0} width={40} height={10} stroke="#4b5563" strokeWidth={1} />
      <Rect x={-19} y={1} width={38 * (socPct/100)} height={8} fill={socPct > 20 ? "#10b981" : "#ef4444"} />

      {/* Charging / SOC text */}
      <Text
        text={isCharging ? "CHARGING" : `${Math.round(socPct)}%`}
        fontSize={8}
        y={-12}
        width={60}
        offsetX={30}
        align="center"
        fill={isCharging ? "#34d399" : "#D1D5DB"}
        fontStyle={isCharging ? "bold" : "normal"}
        listening={false}
      />

      {/* Label */}
      <Text
        text={properties.label || "BAT"}
        fontSize={10}
        y={15}
        width={60}
        offsetX={30}
        align="center"
        fill="#E5E7EB"
        listening={false}
      />
      <Text
        text={`${properties.voltage}V ${properties.capacityAh}Ah`}
        fontSize={8}
        y={25}
        width={60}
        offsetX={30}
        align="center"
        fill="#9CA3AF"
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
