import React, { useId } from 'react';

interface GlobeLogoProps {
  size?: number;
  className?: string;
}

export const GlobeLogo: React.FC<GlobeLogoProps> = ({ size = 64, className = '' }) => {
  // Use unique ID to prevent conflicts if multiple globes are rendered
  const id = useId().replace(/:/g, '');
  const patternId = `map-pattern-${id}`;
  const maskId = `globe-mask-${id}`;
  const gradId = `globe-shine-${id}`;
  const glowId = `globe-outer-glow-${id}`;

  // Dots representing continents roughly mapped to a 200x100 grid
  const dots = [
    // North America
    { cx: 30, cy: 30, r: 2.5 }, { cx: 38, cy: 25, r: 2 }, { cx: 25, cy: 35, r: 2 }, { cx: 45, cy: 32, r: 1.5 },
    // South America
    { cx: 45, cy: 60, r: 2.5 }, { cx: 50, cy: 65, r: 2 }, { cx: 40, cy: 55, r: 2 },
    // Europe
    { cx: 95, cy: 25, r: 2.5 }, { cx: 105, cy: 22, r: 2 }, { cx: 100, cy: 30, r: 1.5 },
    // Africa
    { cx: 100, cy: 50, r: 3 }, { cx: 105, cy: 60, r: 2.5 }, { cx: 90, cy: 45, r: 2 }, { cx: 110, cy: 55, r: 2 },
    // Asia
    { cx: 140, cy: 30, r: 3 }, { cx: 150, cy: 25, r: 2.5 }, { cx: 160, cy: 35, r: 2 }, { cx: 145, cy: 40, r: 2 },
    // Australia
    { cx: 165, cy: 70, r: 2.5 }, { cx: 175, cy: 75, r: 2 },
    
    // Scattered "Data" dots
    { cx: 10, cy: 80, r: 1 }, { cx: 70, cy: 15, r: 1 }, { cx: 130, cy: 85, r: 1 }, 
    { cx: 190, cy: 20, r: 1 }, { cx: 180, cy: 50, r: 1.5 }, { cx: 60, cy: 85, r: 1 },
    { cx: 15, cy: 50, r: 1.5 }, { cx: 120, cy: 15, r: 1 }
  ];

  return (
    <div 
      className={`relative rounded-full overflow-hidden shadow-[0_0_35px_rgba(96,165,250,0.6)] border border-blue-400/50 bg-slate-900 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="block">
        <defs>
          {/* 3D Sphere Shading - Brighter Center */}
          <radialGradient id={gradId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.1" /> {/* Blue tint */}
            <stop offset="85%" stopColor="#0f172a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
          </radialGradient>
          
          {/* Mask to clip the scrolling map to a circle */}
          <mask id={maskId}>
             <circle cx="50" cy="50" r="50" fill="white" />
          </mask>
          
          {/* Seamless Map Pattern */}
          <pattern id={patternId} x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
             {dots.map((d, i) => (
               <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#93c5fd" className="opacity-90" />
             ))}
          </pattern>
        </defs>
        
        {/* Base Sphere Background - Lighter Slate */}
        <circle cx="50" cy="50" r="50" fill="#1e293b" />

        {/* Animated Rotating Layer */}
        <g mask={`url(#${maskId})`}>
            <rect x="0" y="0" width="400" height="100" fill={`url(#${patternId})`} className="animate-globe-spin" />
        </g>

        {/* Lighting Overlay */}
        <circle cx="50" cy="50" r="50" fill={`url(#${gradId})`} pointerEvents="none" />
        
        {/* Brighter Rim Light */}
        <circle cx="50" cy="50" r="49" stroke="rgba(147, 197, 253, 0.5)" strokeWidth="1.5" fill="none" />
        
        <style>{`
          .animate-globe-spin {
            animation: globeSpin 15s linear infinite;
          }
          @keyframes globeSpin {
            from { transform: translateX(0); }
            to { transform: translateX(-200px); }
          }
        `}</style>
      </svg>
    </div>
  );
};