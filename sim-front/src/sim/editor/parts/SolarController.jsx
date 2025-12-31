import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const SolarController = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const mode = properties.mode || (properties.isCharging ? 'CHARGING' : 'IDLE');
  const chargingA = Number(properties.chargingA || 0);
  const pvInputW = Number(properties.pvInputW || properties.inputPowerW || 0);
  const chargingW = Number(properties.chargingW || 0);

  const modeColor =
    (mode === 'BULK' || mode === 'ABSORB' || mode === 'FLOAT') ? '#10b981' :
    mode === 'FULL' ? '#9CA3AF' :
    mode === 'NO_PV' ? '#f59e0b' :
    mode === 'NO_BATTERY' ? '#f97316' :
    '#9CA3AF';

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
        width={70}
        height={90}
        fill="#065f46" // Dark Green
        stroke="#1F2937"
        strokeWidth={1}
        cornerRadius={4}
        offset={{ x: 35, y: 45 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Screen */}
      <Rect
        width={50}
        height={30}
        fill="#d1fae5"
        offset={{ x: 25, y: 15 }}
      />
      <Text 
        text={mode}
        fontSize={8} 
        y={-5} 
        width={50} 
        offsetX={25} 
        align="center" 
        fill={modeColor}
        fontStyle="bold"
      />
      <Text
        text={chargingW > 1 ? `${chargingA.toFixed(1)}A` : ''}
        fontSize={12}
        y={5}
        width={50}
        offsetX={25}
        align="center"
        fill={chargingW > 1 ? '#064e3b' : '#6B7280'}
        fontStyle="bold"
        listening={false}
      />
      <Text
        text={pvInputW > 0 ? `${Math.round(pvInputW)}W` : ''}
        fontSize={8}
        y={18}
        width={50}
        offsetX={25}
        align="center"
        fill="#065f46"
        listening={false}
      />

      {/* Label */}
      <Text
        text={properties.label || "MPPT"}
        fontSize={10}
        fontStyle="bold"
        y={20}
        width={70}
        offsetX={35}
        align="center"
        fill="#a7f3d0"
        listening={false}
      />

      {/* Labels for terminals */}
      <Text text="PV" fontSize={8} x={-25} y={-35} fill="#fff" />
      <Text text="BAT" fontSize={8} x={10} y={30} fill="#fff" />

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
