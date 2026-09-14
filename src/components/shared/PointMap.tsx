import { useState } from 'react';
import { cn } from '~/lib/utils';
import type { InspectionPoint } from '~/lib/types';

interface PointMapProps {
  view: 'top' | 'side_left' | 'side_right' | 'front' | 'rear';
  points: InspectionPoint[];
  onAddPoint?: (x: number, y: number, view: string) => void;
  readonly?: boolean;
}

const SEVERITY_COLORS = {
  minor: '#fbbf24',
  moderate: '#f97316',
  severe: '#ef4444',
};

export function PointMap({ view, points, onAddPoint, readonly = false }: PointMapProps) {
  const [hovering, setHovering] = useState<{ x: number; y: number } | null>(null);

  const viewPoints = points.filter((p) => p.view === view);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly || !onAddPoint) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddPoint(x, y, view);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHovering({ x, y });
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 400 200"
        className={cn(
          'w-full h-auto border rounded-lg bg-gray-50 point-map',
          !readonly && 'cursor-crosshair'
        )}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovering(null)}
      >
        {/* Container outline based on view */}
        {view === 'side_left' || view === 'side_right' ? (
          <ContainerSideView />
        ) : view === 'top' ? (
          <ContainerTopView />
        ) : (
          <ContainerEndView />
        )}

        {/* Damage points */}
        {viewPoints.map((point) => (
          <g key={point.id}>
            <circle
              cx={`${(point.x_coord || 50)}%`}
              cy={`${(point.y_coord || 50)}%`}
              r="8"
              fill={SEVERITY_COLORS[(point.severity as keyof typeof SEVERITY_COLORS) || 'minor']}
              opacity="0.8"
              stroke="white"
              strokeWidth="2"
              className="damage-point"
            />
            <text
              x={`${(point.x_coord || 50)}%`}
              y={`${(point.y_coord || 50) + 1}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="white"
              fontWeight="bold"
            >
              {point.point_code.split('-')[1] || '!'}
            </text>
          </g>
        ))}

        {/* Hover indicator */}
        {hovering && !readonly && (
          <circle
            cx={`${hovering.x}%`}
            cy={`${hovering.y}%`}
            r="6"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.8"
          />
        )}
      </svg>

      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" /> Menor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-400" /> Moderado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Severo
        </span>
        {!readonly && (
          <span className="ml-auto text-blue-600">Clic para marcar daño</span>
        )}
      </div>
    </div>
  );
}

function ContainerSideView() {
  return (
    <g>
      {/* Main body */}
      <rect x="20" y="40" width="360" height="130" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" rx="2" />
      {/* Corrugation lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <line
          key={i}
          x1={40 + i * 19}
          y1="40"
          x2={40 + i * 19}
          y2="170"
          stroke="#d1d5db"
          strokeWidth="1"
        />
      ))}
      {/* Door at right */}
      <rect x="340" y="42" width="38" height="126" fill="#d1d5db" stroke="#6b7280" strokeWidth="1.5" rx="1" />
      <line x1="359" y1="42" x2="359" y2="168" stroke="#9ca3af" strokeWidth="1" />
      {/* Floor */}
      <rect x="20" y="160" width="360" height="10" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
      {/* Corner posts */}
      <rect x="20" y="40" width="10" height="130" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
      <rect x="370" y="40" width="10" height="130" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
    </g>
  );
}

function ContainerTopView() {
  return (
    <g>
      <rect x="20" y="20" width="360" height="160" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" rx="2" />
      {/* Corrugation lines horizontal */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="20"
          y1={40 + i * 18}
          x2="380"
          y2={40 + i * 18}
          stroke="#d1d5db"
          strokeWidth="1"
        />
      ))}
      {/* Roof bows */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={50 + i * 27}
          y1="20"
          x2={50 + i * 27}
          y2="180"
          stroke="#c4b5fd"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      <text x="200" y="15" textAnchor="middle" fontSize="10" fill="#6b7280">VISTA SUPERIOR</text>
    </g>
  );
}

function ContainerEndView() {
  return (
    <g>
      <rect x="80" y="20" width="240" height="160" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" rx="2" />
      {/* Door panels */}
      <rect x="82" y="22" width="116" height="156" fill="#d1d5db" stroke="#6b7280" strokeWidth="1" rx="1" />
      <rect x="202" y="22" width="116" height="156" fill="#d1d5db" stroke="#6b7280" strokeWidth="1" rx="1" />
      {/* Handle bars */}
      <line x1="130" y1="60" x2="130" y2="140" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
      <line x1="270" y1="60" x2="270" y2="140" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
      {/* Corner posts */}
      <rect x="80" y="20" width="8" height="160" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
      <rect x="312" y="20" width="8" height="160" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
    </g>
  );
}
