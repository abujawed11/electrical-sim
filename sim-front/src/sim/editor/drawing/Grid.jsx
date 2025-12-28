import React from 'react';
import { Group, Line } from 'react-konva';

const GRID_SIZE = 50;
const GRID_EXTENT = 5000;
const GRID_COLOR = '#374151'; // dark gray for dark theme

export const Grid = () => {
  const lines = [];

  // Vertical lines
  for (let x = -GRID_EXTENT; x <= GRID_EXTENT; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, -GRID_EXTENT, x, GRID_EXTENT]}
        stroke={GRID_COLOR}
        strokeWidth={x === 0 ? 2 : 0.5} // Thicker origin
        opacity={0.3}
      />
    );
  }

  // Horizontal lines
  for (let y = -GRID_EXTENT; y <= GRID_EXTENT; y += GRID_SIZE) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[-GRID_EXTENT, y, GRID_EXTENT, y]}
        stroke={GRID_COLOR}
        strokeWidth={y === 0 ? 2 : 0.5} // Thicker origin
        opacity={0.3}
      />
    );
  }

  return <Group listening={false}>{lines}</Group>;
};
