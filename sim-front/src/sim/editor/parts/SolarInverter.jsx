import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

export const SolarInverter = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Properties updated by evaluateSolar
  const {
    label,
    enabled,
    isBypassMode,
    status,
    isTripped,
    overloadActive,
    overloadTimerSec,
    isCharging,
    socPercent,
    batteryVoltage,
    loadW,
    outputW,
    dcInputW,
  } = properties;

  const socPercentSafe = Number.isFinite(Number(socPercent)) ? Number(socPercent) : 0;

  const badgeText = isBypassMode ? 'BYPASS' : (status || 'OFF');
  const badgeFill =
    badgeText === 'ON' ? '#10B981' :
    badgeText === 'OVERLOAD' ? '#F59E0B' :
    badgeText === 'TRIPPED' ? '#EF4444' :
    badgeText === 'BYPASS' ? '#3B82F6' :
    '#64748B';

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
          height={110}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 50, y: 55 }}
        />
      )}

      {/* Body */}
      <Rect
        width={94}
        height={104}
        fill="#1E293B" // Slightly bluer gray for Solar distinction
        stroke={overloadActive ? "#F59E0B" : (isTripped ? "#EF4444" : "#64748B")}
        strokeWidth={2}
        cornerRadius={6}
        offset={{ x: 47, y: 52 }}
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
        width={94}
        offsetX={47}
        align="center"
        listening={false}
      />

      {/* Battery Status (External) */}
      <Group y={-15}>
          <Rect
            x={-35}
            y={0}
            width={70}
            height={10}
            stroke="#6B7280"
            strokeWidth={1}
            cornerRadius={2}
            fill="#374151"
          />
          <Rect
            x={-34}
            y={1}
            width={68 * (socPercentSafe / 100)}
            height={8}
            fill={socPercentSafe > 20 ? "#10B981" : "#EF4444"}
            cornerRadius={1}
          />

          {/* Charging Indicator */}
          {isCharging && socPercentSafe < 100 && (
            <Group x={38} y={1}>
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
            text={batteryVoltage > 0 ? `${batteryVoltage.toFixed(1)}V` : 'NO BATT'}
            fontSize={9}
            fill="#D1D5DB"
            x={0}
            y={12}
            width={70}
            offsetX={35}
            align="center"
            listening={false}
          />
          
          {isCharging && (
            <Text
              text="CHARGING"
              fontSize={7}
              fill="#FCD34D"
              x={0}
              y={22}
              width={70}
              offsetX={35}
              align="center"
              listening={false}
            />
          )}
      </Group>

      {/* Mode Badge */}
      <Group y={12}>
          <Rect
            x={-25}
            y={0}
            width={50}
            height={12}
            fill={badgeFill}
            cornerRadius={2}
          />
          <Text
            text={badgeText}
            fontSize={8}
            fontStyle="bold"
            fill="white"
            x={0}
            y={2}
            width={50}
            offsetX={25}
            align="center"
            listening={false}
           />
      </Group>

      {/* Load / Output Summary */}
      <Text
        text={`LOAD ${Math.round(loadW || 0)}W`}
        fontSize={8}
        fill="#9CA3AF"
        x={0}
        y={28}
        width={94}
        offsetX={47}
        align="center"
        listening={false}
      />
      <Text
        text={`OUT  ${Math.round(outputW || 0)}W`}
        fontSize={10}
        fontStyle="bold"
        fill="#E5E7EB"
        x={0}
        y={38}
        width={94}
        offsetX={47}
        align="center"
        listening={false}
      />
      {overloadActive && (
        <Text
          text={`${(Number(overloadTimerSec || 0)).toFixed(1)}s`}
          fontSize={8}
          fill="#F59E0B"
          x={0}
          y={52}
          width={94}
          offsetX={47}
          align="center"
          listening={false}
        />
      )}

      {/* Status Indicators */}
      <Group y={35}>
          <Circle
            x={-20}
            y={0}
            radius={3}
            fill={enabled ? '#10B981' : '#4B5563'}
          />
          <Text
            text="ON"
            fontSize={8}
            fill="#9CA3AF"
            x={-20}
            y={6}
            offsetX={6}
            align="center"
          />

          <Circle
            x={20}
            y={0}
            radius={3}
            fill={overloadActive ? '#F59E0B' : (isTripped ? '#EF4444' : '#4B5563')}
          />
          <Text
            text={isTripped ? 'TRIP' : (overloadActive ? 'OVLD' : 'OK')}
            fontSize={8}
            fill="#9CA3AF"
            x={20}
            y={6}
            offsetX={10}
            align="center"
          />
      </Group>

      <Text
        text={`${Math.round(dcInputW || 0)}W DC`}
        fontSize={8}
        fill="#94A3B8"
        x={0}
        y={62}
        width={94}
        offsetX={47}
        align="center"
        listening={false}
      />
       
      {/* Terminals */}
      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.kind === 'NEUTRAL') isEnergized = simulationState.neutralSet.has(terminalIdStr);
        if (t.kind === 'EARTH') isEnergized = simulationState.earthSet.has(terminalIdStr);
        // DC Check
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
