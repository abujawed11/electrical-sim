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
      capacityVA, 
      enabled, 
      isOverloaded, 
      isCharging, 
      status, 
      isAlarming, 
      overloadStartTime, 
      overloadShutdownDelayMs,
      socWh, // This will be the "Display" SOC from connected batteries
      batteryVoltage 
  } = properties;

  // We assume a standard 12V 100Ah battery (1200Wh) as a reference if no max is known, 
  // or we can just try to display socWh if we knew the total capacity.
  // evaluateSolar should probably provide a 'socPercent' or 'totalCapacityWh' for better display.
  // For now, let's assume if socWh is provided, it's the current energy.
  // But wait, without total capacity, a bar is hard.
  // Let's rely on evaluateSolar to push 'socPercent' if possible, or just raw display.
  // Actually, standard Inverter has 'batteryWh'. Solar Inverter depends on external.
  // Let's check if 'socPercent' is in properties (pushed by logic).
  
  const socPercent = properties.socPercent ?? 0;

  // Blinking effect for alarm
  const [blinkState, setBlinkState] = React.useState(false);
  const [remainingTime, setRemainingTime] = React.useState(0);

  React.useEffect(() => {
    if (isAlarming) {
      const interval = setInterval(() => setBlinkState(prev => !prev), 500);
      return () => clearInterval(interval);
    }
  }, [isAlarming]);

  React.useEffect(() => {
    if (isAlarming && overloadStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - overloadStartTime;
        const remaining = Math.max(0, (overloadShutdownDelayMs || 30000) - elapsed);
        setRemainingTime(Math.ceil(remaining / 1000));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isAlarming, overloadStartTime, overloadShutdownDelayMs]);

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
        stroke={isOverloaded ? (isAlarming && blinkState ? "#FCA5A5" : "#EF4444") : "#64748B"}
        strokeWidth={2}
        cornerRadius={6}
        offset={{ x: 47, y: 52 }}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Alarm/Buzzer Indicator */}
      {isAlarming && (
        <Group x={40} y={-45}>
          <Circle
            x={0}
            y={0}
            radius={6}
            fill={blinkState ? "#EF4444" : "#FCA5A5"}
            stroke="#DC2626"
            strokeWidth={1}
          />
          <Text
            text="🔔"
            fontSize={8}
            x={-3}
            y={-3}
            listening={false}
          />
          <Text
            text={`${remainingTime}s`}
            fontSize={6}
            fill={blinkState ? "#FFFFFF" : "#FCA5A5"}
            fontStyle="bold"
            x={0}
            y={8}
            width={12}
            offsetX={6}
            align="center"
            listening={false}
          />
        </Group>
      )}

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
            width={68 * (socPercent / 100)}
            height={8}
            fill={socPercent > 20 ? "#10B981" : "#EF4444"}
            cornerRadius={1}
          />

          {/* Charging Indicator */}
          {isCharging && socPercent < 100 && (
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
            fill={status === 'Mains (Bypass)' ? '#3B82F6' : '#8B5CF6'}
            cornerRadius={2}
          />
          <Text
            text={status === 'Mains (Bypass)' ? 'BYPASS' : 'INVERTER'}
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
            fill={isOverloaded ? '#EF4444' : '#4B5563'}
          />
          <Text
            text="OVLD"
            fontSize={8}
            fill="#9CA3AF"
            x={20}
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
