import React from 'react';
import { Group, Rect, Text } from 'react-konva';

export const MCB = ({ id, x, y, isSelected, properties, onSelect, onDragEnd }) => {
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
          width={40}
          height={60}
          stroke="#00A3FF"
          strokeWidth={2}
          offset={{ x: 20, y: 30 }}
        />
      )}

      {/* Body */}
      <Rect
        width={36}
        height={56}
        fill="#E5E7EB"
        stroke="#374151"
        strokeWidth={1}
        cornerRadius={2}
        offset={{ x: 18, y: 28 }}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.2}
        shadowOffset={{ x: 1, y: 1 }}
      />

      {/* Switch Toggle (Visual) */}
      <Rect
        x={-5}
        y={-5}
        width={10}
        height={10}
        fill="#1F2937"
        cornerRadius={1}
      />

      {/* Label */}
      <Text
        text={properties.label}
        fontSize={10}
        y={15}
        width={36}
        offsetX={18}
        align="center"
        fill="#1F2937"
      />
      
      {/* Rating */}
       <Text
        text={properties.rating}
        fontSize={8}
        y={-25}
        width={36}
        offsetX={18}
        align="center"
        fill="#6B7280"
      />
    </Group>
  );
};
