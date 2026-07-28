import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cloud3D } from './Cloud3D';
import type { CloudSystemConfig } from './Cloud3D';
import { View } from '@react-three/drei';
import { CityWeather } from '../types';
import { getTheme, getIcon, getMoonPhase, getMoonPhaseDetails } from '../constants';
import clsx from 'clsx';
import { CloudRain, Droplets, Wind, Sunrise, Sunset, Sun, Loader2, Layers, Cloud, LayoutDashboard } from 'lucide-react';

export interface CustomGradient {
  from: string;
  via: string;
  to: string;
}

interface WeatherCardProps {
  data: CityWeather;
  index: number;
  isDemo?: boolean;
  customCloudConfig?: CloudSystemConfig; // For Design Studio
  customData?: Partial<CityWeather>;     // For Design Studio
  customGradient?: CustomGradient;       // For Design Studio
  showLayers?: boolean;                  // For Design Studio (Exploded View)
}

interface Obstacle {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const MoonPhaseIcon = ({ phase, size = 42 }: { phase: number; size?: number }) => {
  const r = 45;
  const c = 50;
  const p = phase % 1;
  const isWaxing = p <= 0.5;
  const isLeftLit = !isWaxing;
  const sweepOuter = isLeftLit ? 0 : 1;
  const xRadius = Math.abs(r * Math.cos(2 * Math.PI * p));
  
  let sweepInner = 0;
  if (p < 0.25) sweepInner = 1;       
  else if (p < 0.5) sweepInner = 0;   
  else if (p < 0.75) sweepInner = 1;  
  else sweepInner = 0;                

  const path = `
    M ${c} ${c - r}
    A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r}
    A ${xRadius} ${r} 0 0 ${sweepInner} ${c} ${c - r}
  `;
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-md">
      <circle cx="50" cy="50" r="45" fill="#334155" stroke="#475569" strokeWidth="1" opacity="0.9" />
      <path d={path} fill="#f8fafc" filter="url(#glow)" />
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
};

interface WeatherEffectsProps {
    type: 'rain' | 'snow' | 'fog' | 'none';
    obstacles: Obstacle[];
    active: boolean;
    windSpeed?: number;
    isDay?: boolean;
}

const WeatherEffects = ({ type, obstacles, active, windSpeed = 10, isDay = true }: WeatherEffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const windSpeedRef = useRef(windSpeed);

  useEffect(() => { windSpeedRef.current = windSpeed; }, [windSpeed]);

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!active || type === 'none') return;
    
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            width = entry.contentRect.width;
            height = entry.contentRect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }
    });
    resizeObserver.observe(container);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let particles: any[] = [];
    
    // Particle creation logic
    const createParticle = (initial: boolean = false) => {
        const x = Math.random() * width;
        const yStart = initial ? Math.random() * height : -20;
        const wind = windSpeedRef.current;
        const windOffset = wind / 15;
        
        if (type === 'rain') {
            return {
                x, y: yStart,
                vx: (Math.random() - 0.5) * 0.5 + windOffset * 0.5,
                vy: 15 + Math.random() * 10, 
                len: 10 + Math.random() * 15,
                type: 'drop'
            };
        } else if (type === 'snow') {
            return {
                x, y: yStart,
                vx: (Math.random() - 0.5) * 1 + windOffset, 
                vy: 0.5 + Math.random() * 1.5,
                r: 1.5 + Math.random() * 2,
                sway: Math.random() * 100,
                type: 'flake',
                variant: Math.floor(Math.random() * 5), 
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1
            };
        } else if (type === 'fog') {
             const speed = (wind / 20) + 0.1 + Math.random() * 0.2;
             return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: speed,
                r: 40 + Math.random() * 60,
                opacity: 0.03 + Math.random() * 0.04, 
                sway: Math.random() * 100,
                type: 'puff'
             };
        }
        return {};
    };

    const particleCount = type === 'rain' ? 80 : (type === 'snow' ? 60 : 25);
    for (let i = 0; i < particleCount; i++) particles.push(createParticle(true));

    let animationFrameId: number;
    const loop = () => {
        ctx.clearRect(0, 0, width, height);
        const time = Date.now() * 0.001;
        
        // Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            let reset = false;

            if (type === 'rain') {
                 p.y += p.vy; p.x += (p.vx || 0);
                 if (p.y > height) reset = true;
                 if (!reset) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + (p.vx||0), p.y + p.len);
                    ctx.stroke();
                 }
            } else if (type === 'snow') {
                p.y += p.vy;
                p.x += Math.sin(time + p.sway) * 0.5 + (p.vx || 0);
                if (p.y > height) reset = true;
                if (!reset) {
                   ctx.fillStyle = 'rgba(255,255,255,0.8)';
                   ctx.beginPath();
                   ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                   ctx.fill();
                }
            } else if (type === 'fog') {
                p.x += p.vx;
                p.y += Math.sin(time * 0.5 + p.sway) * 0.3;
                if (p.x > width + p.r * 2) {
                    p.x = -p.r * 2;
                    p.y = Math.random() * height;
                }
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                const c = isDay ? '255,255,255' : '200,210,230';
                grad.addColorStop(0, `rgba(${c}, ${p.opacity})`);
                grad.addColorStop(1, `rgba(${c}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            if (reset) particles[i] = createParticle();
        }
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animationFrameId);
    };
  }, [type, active, isDay]); 

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="absolute inset-0 z-20 rounded-3xl overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

// --- Constants for 3D Rotation in Studio ---
const EXP_ROT_X = 40;
const EXP_ROT_Y = -15;

// --- Updated Draggable Layer Label Component ---
interface LayerLabelProps {
    text: string;
    z: number;
    icon: any;
    colorClass: string;
    height?: number;
    x: number; // Percentage 0-100 (Anchor Point)
    y: number; // Percentage 0-100 (Anchor Point)
}

const LayerLabel = ({ text, z, icon: Icon, colorClass, height = 100, x, y }: LayerLabelProps) => {
    // State for the draggable badge offset relative to the anchor
    const [offset, setOffset] = useState({ x: 0, y: -height });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            // Accounting for the scale factor of the parent card (0.7 in exploded view)
            // to ensure 1:1 mouse movement feel
            const scale = 0.7; 
            const dx = (e.clientX - dragStart.current.x) / scale;
            const dy = (e.clientY - dragStart.current.y) / scale;
            
            setOffset({
                x: initialOffset.current.x + dx,
                y: initialOffset.current.y + dy
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const startDrag = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent 3D orbit controls or other interactions
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialOffset.current = { ...offset };
        document.body.style.cursor = 'grabbing';
    };

    return (
        <div 
            className="absolute w-0 h-0"
            style={{ 
                top: `${y}%`, 
                left: `${x}%`, 
                // Counter-rotate so the coordinate system creates a flat 2D plane facing the camera
                // This allows standard 2D drag logic to work reasonably well visually
                transform: `rotateY(${-EXP_ROT_Y}deg) rotateX(${-EXP_ROT_X}deg)`,
                zIndex: 1000 + z, 
                pointerEvents: 'none', // Allow clicks to pass through the empty wrapper
            }}
        >
            {/* Anchor Point (Fixed on Layer) */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 group cursor-crosshair pointer-events-auto">
                <div className={`w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor] ring-1 ring-white/40 z-10 relative`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${colorClass.replace('text-', 'bg-')} opacity-20 animate-ping pointer-events-none`} />
            </div>

            {/* Dynamic Connector Wire */}
            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ zIndex: -1 }}>
                <line 
                    x1={0} 
                    y1={0} 
                    x2={offset.x} 
                    y2={offset.y} 
                    stroke="currentColor" 
                    className={clsx("stroke-[1.5px]", colorClass.replace('text-', 'stroke-').replace('400', '500'))}
                    strokeOpacity="0.5"
                    strokeDasharray="3 2" 
                />
                {/* Connection dot on wire end */}
                 <circle cx={offset.x} cy={offset.y} r="1.5" fill="currentColor" className={colorClass} opacity="0.6" />
            </svg>

            {/* Draggable Badge */}
            <div 
                onMouseDown={startDrag}
                className={clsx(
                    "absolute flex items-center gap-3 px-3.5 py-2 rounded-lg border shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition-transform cursor-grab active:cursor-grabbing select-none pointer-events-auto group/badge",
                    "bg-slate-950/80 backdrop-blur-md border-white/10",
                    isDragging ? "scale-105 ring-1 ring-white/20" : "hover:scale-105 hover:bg-slate-900/90"
                )}
                style={{ 
                    // Translate to offset position, then center the element on that point
                    transform: `translate(${offset.x}px, ${offset.y}px) translate(-50%, -50%)`,
                    minWidth: 'max-content',
                }}
            >
                 {/* Icon Container */}
                <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-white/5 border border-white/10 ${colorClass}`}>
                    <Icon size={14} strokeWidth={2.5} />
                </div>
                
                <div className="flex flex-col gap-0 text-left">
                    <span className="text-xs font-bold text-white tracking-tight">{text}</span>
                    <div className="flex items-center gap-2">
                         <span className={`text-[8px] font-bold uppercase tracking-wider ${colorClass} opacity-90`}>
                            Layer {(z/100).toFixed(0)}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">
                            Z: {z}px
                        </span>
                    </div>
                </div>
                
                {/* Hover Tooltip Hint */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Drag to move
                </div>
            </div>
        </div>
    );
};

const WeatherCard: React.FC<WeatherCardProps> = ({ data, index, isDemo = false, customCloudConfig, customData, customGradient, showLayers }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Internal state for independent toggling in Feed view
  const [isExploded, setIsExploded] = useState(false);

  // Check if controlled by prop (DesignStudio) or self (Feed)
  const activeShowLayers = showLayers !== undefined ? showLayers : isExploded;
  const isControlled = showLayers !== undefined;

  // Merge custom data for Studio
  const weatherData = useMemo(() => {
      if (!customData) return data;
      return {
          ...data,
          ...customData,
          placeholderData: {
              ...data.placeholderData,
              ...(customData.placeholderData || {})
          },
          theme: customData.theme || data.theme
      };
  }, [data, customData]);

  const [isLoading, setIsLoading] = useState(!isDemo);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardContainerRef, { margin: "100px 0px 100px 0px" });

  const moonPhase = useMemo(() => getMoonPhase(new Date()), []);
  const { name: moonPhaseName, illumination: moonIllumination } = useMemo(() => getMoonPhaseDetails(moonPhase), [moonPhase]);

  useEffect(() => {
    if (!isInView) return; 
    const updateTime = () => {
      try {
        const now = new Date();
        setCurrentTime(new Intl.DateTimeFormat('en-US', {
          weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: weatherData.timezone
        }).format(now));
      } catch (e) { setCurrentTime('Local Time'); }
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [weatherData.timezone, isInView]);

  useEffect(() => {
    if (isDemo) { setIsLoading(false); return; }
    setIsLoading(false); 
  }, [isDemo]);

  const { placeholderData } = weatherData;
  const currentTempF = Math.round((placeholderData.temp_c * 9 / 5) + 32);
  
  const weatherEffectType = useMemo(() => {
      const s = weatherData.placeholderData.icon_slug;
      if (s.includes('snow') || s.includes('blizzard')) return 'snow';
      if (s.includes('rain') || s.includes('drizzle') || s.includes('thunder') || s.includes('showers')) return 'rain';
      if (s.includes('fog')) return 'fog'; 
      return 'none';
  }, [weatherData.placeholderData.icon_slug]);

  const hasActiveWeatherEffect = weatherEffectType !== 'none';

  const weatherLayerLabel = useMemo(() => {
      switch (weatherEffectType) {
          case 'snow': return 'Snowfall';
          case 'rain': return 'Rainfall';
          case 'fog': return 'Dense Fog';
          default: return 'Precipitation';
      }
  }, [weatherEffectType]);

  // --- Styles for Gradient Override ---
  const containerStyle = customGradient ? {
    background: `linear-gradient(to bottom right, ${customGradient.from}, ${customGradient.via}, ${customGradient.to})`
  } : {};

  // --- Layer Explosion Logic ---
  const layerTransition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  // Helper for layer styling in exploded mode - Enhanced distinctions & Colors
  const getExplodedLayerStyle = (zIndex: number, type: 'ui' | 'clouds' | 'precip' | 'base') => {
      if (!activeShowLayers) return {};
      
      const isDay = weatherData.isDay;
      const borderColor = isDay ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
      
      if (type === 'ui') {
          return {
              boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)',
              border: `1px solid ${borderColor}`,
              // Clearer glass for day, darker transparent for night.
              backgroundColor: isDay ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.4)', 
              backdropFilter: 'blur(8px)' 
          };
      }
      
      if (type === 'precip') {
          return {
              border: '1px dashed rgba(255,255,255,0.15)',
              backgroundColor: 'transparent',
              boxShadow: 'none' 
          };
      }
      
      if (type === 'clouds') {
           const tint = isDay ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)';
           return {
               border: '1px solid rgba(255,255,255,0.15)',
               backgroundColor: tint
           };
      }
      
      if (type === 'base') {
           return {
                border: '1px solid rgba(255,255,255,0.3)',
           };
      }
      
      return {};
  };

  // Dynamic styles for the "Cloud Volume" frame based on weather
  const getCloudFrameColors = () => {
     if (weatherData.isDay) return {
         bg: 'bg-amber-100/5',
         border: 'border-amber-200/30',
         accent: 'border-amber-300/60'
     };
     return {
         bg: 'bg-indigo-500/5',
         border: 'border-indigo-400/30',
         accent: 'border-indigo-400/60'
     };
  };
  
  const cloudFrame = getCloudFrameColors();

  return (
    <motion.div
      ref={cardContainerRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="break-inside-avoid mb-6 relative"
      style={{ 
          perspective: activeShowLayers ? '2000px' : 'none', 
          transformStyle: activeShowLayers ? 'preserve-3d' : 'flat',
          // Z-index boost when exploded to float above other cards in masonry grid
          zIndex: activeShowLayers ? 50 : 1
      }}
    >
      <motion.div 
        className={clsx(
            "weather-card-container relative w-full rounded-3xl border border-white/20 shadow-2xl",
            "transition-all duration-500",
            // Overflow visible required for popped out labels
            activeShowLayers ? "overflow-visible" : "overflow-hidden",
            !customGradient && weatherData.theme.from, 
            !customGradient && weatherData.theme.via, 
            !customGradient && weatherData.theme.to
        )}
        style={{
            ...containerStyle,
            transformStyle: 'preserve-3d',
        }}
        animate={{
            rotateX: activeShowLayers ? EXP_ROT_X : 0,
            rotateY: activeShowLayers ? EXP_ROT_Y : 0,
            scale: activeShowLayers ? 0.7 : 1, 
            y: activeShowLayers ? 120 : -20, // Lifted in standard mode, deeply dropped in exploded mode to avoid top clipping
        }}
        transition={layerTransition}
      >
        {/* Background Technical Grid (Visible only in Exploded View) */}
         {activeShowLayers && (
            <div 
                className="absolute inset-0 opacity-20 pointer-events-none rounded-3xl" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    zIndex: 0,
                    ...getExplodedLayerStyle(0, 'base')
                }}
            />
         )}

        {/* Layer Label for Background (Base) - Z=0 */}
         {activeShowLayers && (
            <LayerLabel 
                text="Base Gradient" 
                z={0} 
                icon={Layers} 
                colorClass="text-blue-400"
                height={60} 
                x={95} // Bottom Right corner
                y={95}
            />
           )}
        
        {/* --- LAYER 1: 3D Scene (Background Clouds) - Z=100 --- */}
        <motion.div 
            ref={viewRef} 
            className={clsx(
                "absolute inset-0 w-full h-full pointer-events-none rounded-3xl",
                activeShowLayers ? "overflow-visible" : "overflow-hidden"
            )}
            style={{ 
                zIndex: 0,
                ...getExplodedLayerStyle(100, 'clouds')
            }}
            animate={{ translateZ: activeShowLayers ? 100 : 0 }}
            transition={layerTransition}
        >
           {isInView && (
             <View track={viewRef}>
               <Cloud3D 
                 weatherCode={weatherData.placeholderData.icon_slug} 
                 isDay={weatherData.isDay}
                 moonPhase={moonPhase}
                 config={customCloudConfig} 
                 showCelestial={!activeShowLayers} 
               />
             </View>
           )}
           
           {/* Visual Frame for the Cloud Volume when exploded */}
           {activeShowLayers && (
                <div className={`absolute inset-0 rounded-3xl pointer-events-none border ${cloudFrame.border} ${cloudFrame.bg}`}>
                    {/* Corner Brackets - tinted by theme color */}
                    <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg ${cloudFrame.accent}`} />
                    <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg ${cloudFrame.accent}`} />
                    <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg ${cloudFrame.accent}`} />
                    <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg ${cloudFrame.accent}`} />
                </div>
           )}

            {activeShowLayers && (
               <LayerLabel 
                    text="Volumetric Clouds" 
                    z={100} 
                    icon={Cloud} 
                    colorClass={weatherData.isDay ? "text-amber-400" : "text-sky-400"}
                    height={80}
                    x={98} 
                    y={50} // Raised to middle-right to stay on screen
               />
           )}
        </motion.div>

        {/* --- LAYER 2: Weather Effects (Middle) - Z=300 (Behind UI) --- */}
        {/* REORDERED: Moved Precipitation BEHIND UI (Z=300) but IN FRONT of Clouds (Z=100) */}
        {hasActiveWeatherEffect && (
        <motion.div 
            className={clsx(
                "absolute inset-0 pointer-events-none rounded-3xl",
                activeShowLayers ? "overflow-visible" : "overflow-hidden"
            )}
            style={{ 
                zIndex: 20,
                ...getExplodedLayerStyle(300, 'precip')
             }}
            animate={{ translateZ: activeShowLayers ? 300 : 0 }} 
            transition={layerTransition}
        >
            <WeatherEffects 
                type={weatherEffectType} 
                obstacles={[]} 
                active={isInView} 
                windSpeed={weatherData.placeholderData.wind_kph}
                isDay={weatherData.isDay}
            />
            {activeShowLayers && (
                <LayerLabel 
                    text={weatherLayerLabel} 
                    z={300} 
                    icon={Droplets} 
                    colorClass="text-purple-400"
                    height={100} // Reduced height to keep text visible
                    x={60} 
                    y={10} // Lifted high up near top edge but clear
               />
           )}
        </motion.div>
        )}

        {/* --- LAYER 3: UI Content (Front) - Z=500 (Topmost) --- */}
        {/* REORDERED: UI is now at Z=500 to sit ON TOP of everything including Rain */}
        <motion.div 
            className={clsx(
                "p-6 relative text-white rounded-3xl",
                activeShowLayers ? "overflow-visible" : "overflow-hidden"
            )}
            style={{ 
                zIndex: 30, // Dom UI layer
                ...(activeShowLayers ? { border: '1px solid rgba(255,255,255,0.05)' } : {}),
                ...getExplodedLayerStyle(500, 'ui')
            }}
            animate={{ translateZ: activeShowLayers ? 500 : 0 }}
            transition={layerTransition}
        >
           {activeShowLayers && (
                <LayerLabel 
                    text="UI Interface" 
                    z={500} 
                    icon={LayoutDashboard} 
                    colorClass="text-amber-400"
                    height={100}
                    x={96} // Right Edge - UI Layer
                    y={45}
               />
           )}

          {/* Toggle Button for Feed Mode */}
          {!isControlled && (
            <div className="absolute top-6 right-6 z-50">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExploded(!isExploded); }}
                    className={clsx(
                        "p-2 rounded-full backdrop-blur-md transition-all duration-300 border pointer-events-auto",
                        activeShowLayers 
                            ? "bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white/20" 
                            : "bg-black/10 border-white/5 text-slate-400 hover:bg-black/30 hover:text-white hover:scale-110"
                    )}
                    title={activeShowLayers ? "Collapse Layers" : "Inspect Layers"}
                >
                    <Layers size={16} />
                </button>
            </div>
          )}

          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col gap-1 drop-shadow-md">
               <div className="text-sm font-medium opacity-90 tracking-wide drop-shadow-lg">{currentTime}</div>
               <div className="text-lg font-semibold tracking-tight leading-tight max-w-[140px] drop-shadow-lg">
                {weatherData.city}, {weatherData.country}
               </div>
               
               <div className="flex items-center gap-2 mt-1 h-5">
                {isLoading && <Loader2 className="animate-spin w-3 h-3 opacity-50" />}
                {isDemo && !isLoading && (
                     <div className="flex items-center text-amber-200 text-[10px] bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/30 backdrop-blur-md">
                     <span>Studio Mode</span>
                     </div>
                )}
               </div>
            </div>
          </div>

          <div className="flex flex-col justify-center mb-8 drop-shadow-lg">
            <div className="text-7xl font-bold tracking-tighter relative z-10 drop-shadow-xl">
              {currentTempF}°
            </div>
            <div className="text-xl font-medium opacity-90 mt-1 flex items-center gap-2 text-blue-50 drop-shadow-lg">
               {placeholderData.condition}
            </div>
          </div>

          <div className="relative">
          {weatherData.isDay ? (
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center mb-4 border border-white/10 shadow-lg">
              <div className="text-center">
                <Sunrise size={18} className="mx-auto mb-1 opacity-90 text-yellow-200 drop-shadow-md" />
                <div className="text-[10px] opacity-80">{weatherData.sunrise}</div>
              </div>
              <div className="text-center px-2">
                  <Sun size={14} className="mx-auto mb-1 opacity-60 drop-shadow-md" />
                  <div className="text-xs opacity-90 font-medium">{weatherData.dayLength}</div>
              </div>
              <div className="text-center">
                <Sunset size={18} className="mx-auto mb-1 opacity-90 text-orange-200 drop-shadow-md" />
                <div className="text-[10px] opacity-80">{weatherData.sunset}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between mb-4 border border-white/10 shadow-lg">
              <div className="flex items-center gap-3 w-full">
                  <MoonPhaseIcon phase={moonPhase} size={36} />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-100 drop-shadow-md">{moonIllumination}% Illumination</span>
                    <span className="text-[10px] opacity-60 uppercase tracking-wider">{moonPhaseName}</span>
                  </div>
              </div>
           </div>
          )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-black/10 backdrop-blur-md rounded-xl p-3 flex items-center border border-white/10 shadow-sm col-span-2 transition-colors hover:bg-black/20">
              <CloudRain size={20} className="mr-3 text-blue-200 drop-shadow-md" />
              <div className="text-sm font-medium flex flex-col">
                 <span className="text-xs opacity-70">Precipitation</span>
                 <span className="drop-shadow-sm">{weatherData.precipChance}% Chance</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-black/10 backdrop-blur-md rounded-xl p-2 border border-white/10 shadow-sm" title="Humidity">
                <Droplets size={14} className="mr-2 opacity-70 drop-shadow-sm" />
                <span className="text-xs drop-shadow-sm">{placeholderData.humidity}%</span>
            </div>
            <div className="flex items-center justify-center bg-black/10 backdrop-blur-md rounded-xl p-2 border border-white/10 shadow-sm" title="Wind Speed">
                <Wind size={14} className="mr-2 opacity-70 drop-shadow-sm" />
                <span className="text-xs drop-shadow-sm">{placeholderData.wind_kph} km/h</span>
            </div>
          </div>

          <div className="flex justify-between gap-1">
            {weatherData.forecast.map((day, i) => (
              <div key={i} className="flex-1 bg-black/10 hover:bg-black/30 backdrop-blur-sm transition-all duration-200 rounded-xl p-2 text-center border border-white/5 cursor-pointer group">
                <div className="text-[10px] font-medium opacity-70 mb-1 drop-shadow-sm">{day.day}</div>
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform drop-shadow-sm">{day.icon}</div>
                <div className="text-xs font-semibold drop-shadow-sm">{day.high}°</div>
                <div className="text-[10px] opacity-50 drop-shadow-sm">{day.low}°</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default WeatherCard;