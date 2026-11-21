import { useMemo } from 'react';
import { fakeQrMatrix } from '../../lib/utils';

export default function FauxQr({ seed = 'eclat', size = 120, fg = '#0B1120', bg = '#FFFFFF', className }) {
  const matrix = useMemo(() => fakeQrMatrix(seed, 25), [seed]);
  const cell = 100 / matrix.length;
  const rects = [];
  matrix.forEach((row, rowIndex) => {
    row.forEach((filled, colIndex) => {
      if (filled) {
        rects.push(
          <rect
            key={`${rowIndex}-${colIndex}`}
            x={colIndex * cell}
            y={rowIndex * cell}
            width={cell}
            height={cell}
          />,
        );
      }
    });
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="QR pass"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width="100" height="100" fill={bg} />
      <g fill={fg} transform="translate(2 2) scale(0.96)">
        {rects}
      </g>
    </svg>
  );
}
