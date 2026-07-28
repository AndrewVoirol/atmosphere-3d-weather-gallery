
import React, { useState, useEffect, useMemo } from 'react';
import type { CloudSystemConfig } from './Cloud3D';
import WeatherCard from './WeatherCard';
import type { CustomGradient } from './WeatherCard';
import { CITIES, getTheme } from '../constants';
import { CityWeather } from '../types';
import { Sliders, Cloud, Sun, Palette, Droplets, Layers, Moon, Sunset } from 'lucide-react';

const PRESETS = {
    'Clear Day': { code: 'clear-day', cloud: 0.1, fog: 0.01, isDay: true, wind: 5, layers: 1 },
    'Partly Cloudy': { code: 'partly-cloudy-day', cloud: 0.4, fog: 0.02, isDay: true, wind: 15, layers: 2 },
    'Overcast': { code: 'overcast', cloud: 0.9, fog: 0.08, isDay: true, wind: 10, layers: 2 },
    'Storm': { code: 'thunderstorm', cloud: 1.0, fog: 0.12, isDay: false, wind: 40, layers: 3 },
    'Foggy': { code: 'fog', cloud: 0.5, fog: 0.25, isDay: true, wind: 2, layers: 2 },
    'Snow': { code: 'snow', cloud: 0.8, fog: 0.15, isDay: true, wind: 20, layers: 2 },
};

// Recommended gradients for quick selection - UPDATED VIBRANT
const GRADIENT_THEMES = {
    'Day': { from: '#3b82f6', via: '#60a5fa', to: '#93c5fd' },
    'Sunset': { from: '#f97316', via: '#ef4444', to: '#facc15' }, // Vibrant Orange/Red
    'Night': { from: '#2e1065', via: '#4c1d95', to: '#1e1b4b' }, // Deep Violet/Indigo
    'Storm': { from: '#4c1d95', via: '#581c87', to: '#1e1b4b' }, // Electric Purple
};

const DesignStudio: React.FC = () => {
    // --- State ---
    const [activePreset, setActivePreset] = useState('Partly Cloudy');
    
    // Atmosphere
    const [cloudCoverage, setCloudCoverage] = useState(0.4);
    const [cloudDensity, setCloudDensity] = useState(0.8);
    const [cloudSpeed, setCloudSpeed] = useState(0.05);
    const [fogDensity, setFogDensity] = useState(0.02);
    
    // Environment
    const [isDay, setIsDay] = useState(true);
    const [windSpeed, setWindSpeed] = useState(15);
    const [weatherCode, setWeatherCode] = useState('partly-cloudy-day');
    
    // Colors
    const [cloudColor, setCloudColor] = useState('#ffffff');
    const [fogColor, setFogColor] = useState('#bfdbfe');

    // Card Styling
    const [bgFrom, setBgFrom] = useState('#3b82f6');
    const [bgVia, setBgVia] = useState('#60a5fa');
    const [bgTo, setBgTo] = useState('#93c5fd');
    
    // Tools
    const [showLayers, setShowLayers] = useState(false);

    const applyPreset = (name: string) => {
        const p = PRESETS[name as keyof typeof PRESETS];
        setActivePreset(name);
        setCloudCoverage(p.cloud);
        setFogDensity(p.fog);
        setIsDay(p.isDay);
        setWindSpeed(p.wind);
        setWeatherCode(p.code);
        
        // Auto-tune colors based on preset logic
        if (!p.isDay) {
            setCloudColor('#64748b');
            setFogColor('#0f172a');
            setBgFrom(GRADIENT_THEMES.Night.from);
            setBgVia(GRADIENT_THEMES.Night.via);
            setBgTo(GRADIENT_THEMES.Night.to);
        } else if (name === 'Storm') {
            setCloudColor('#475569');
            setFogColor('#334155');
            setBgFrom(GRADIENT_THEMES.Storm.from);
            setBgVia(GRADIENT_THEMES.Storm.via);
            setBgTo(GRADIENT_THEMES.Storm.to);
        } else {
            setCloudColor('#ffffff');
            setFogColor('#bfdbfe');
            setBgFrom(GRADIENT_THEMES.Day.from);
            setBgVia(GRADIENT_THEMES.Day.via);
            setBgTo(GRADIENT_THEMES.Day.to);
        }
    };

    // --- Construct Cloud Config ---
    const cloudConfig: CloudSystemConfig = useMemo(() => {
        const layers = [];
        
        // Back Layer (Slow, Large)
        if (cloudCoverage > 0.1) {
            layers.push({
                z: -12, seed: 1, speed: cloudSpeed * 0.5, density: cloudDensity * 0.8, 
                coverage: cloudCoverage, sharpness: 0.4, detail: 1.0, color: cloudColor
            });
        }
        
        // Mid Layer (Main Volume)
        if (cloudCoverage > 0.2) {
             layers.push({
                z: -8, seed: 55, speed: cloudSpeed, density: cloudDensity, 
                coverage: cloudCoverage * 0.9, sharpness: 0.6, detail: 1.0, color: cloudColor
            });
        }

        // Front Layer (Fast, Wispy)
        if (cloudCoverage > 0.5) {
             layers.push({
                z: -5, seed: 99, speed: cloudSpeed * 2.0, density: cloudDensity * 0.4, 
                coverage: cloudCoverage * 0.6, sharpness: 0.2, detail: 1.0, color: cloudColor
            });
        }

        return {
            fogColor: fogColor,
            fogDensity: fogDensity,
            ambientIntensity: isDay ? 0.8 : 0.3,
            lightIntensity: isDay ? 1.2 : 0.4,
            layers
        };
    }, [cloudCoverage, cloudDensity, cloudSpeed, cloudColor, fogDensity, fogColor, isDay]);

    // --- Construct Gradient Config ---
    const customGradient: CustomGradient = useMemo(() => ({
        from: bgFrom,
        via: bgVia,
        to: bgTo
    }), [bgFrom, bgVia, bgTo]);

    // --- Mock City Data ---
    const studioCity: CityWeather = {
        ...CITIES[0],
        city: "Design Studio",
        country: "Sandbox",
        isDay: isDay,
        placeholderData: {
            ...CITIES[0].placeholderData,
            temp_c: 22,
            condition: activePreset,
            icon_slug: weatherCode,
            wind_kph: windSpeed,
            humidity: Math.round(fogDensity * 200) // fake relation
        },
        theme: getTheme(isDay, weatherCode, 22, 50)
    };

    const applyGradientTheme = (theme: typeof GRADIENT_THEMES.Day) => {
        setBgFrom(theme.from);
        setBgVia(theme.via);
        setBgTo(theme.to);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Panel: Controls */}
            <div className="lg:col-span-4 space-y-6 bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 h-fit max-h-[80vh] overflow-y-auto custom-scrollbar">
                
                {/* Inspector Mode Toggle - Prominently Placed */}
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Layers className={showLayers ? "text-indigo-400" : "text-slate-500"} size={24} />
                        <div>
                            <h3 className="text-sm font-semibold text-white">Layer Inspector</h3>
                            <p className="text-[10px] text-indigo-200/70">Visualize Z-Index Depth</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowLayers(!showLayers)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${showLayers ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showLayers ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center gap-2 text-blue-300 mb-4">
                    <Sliders size={20} />
                    <h2 className="text-xl font-bold text-white">Environment Controls</h2>
                </div>

                {/* Presets */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(PRESETS).map(name => (
                            <button 
                                key={name}
                                onClick={() => applyPreset(name)}
                                className={`text-xs py-2 px-1 rounded-lg transition-all ${activePreset === name ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                {/* Card Background Controls */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white/90">
                        <Palette size={16} />
                        <span className="font-semibold text-sm">Card Background</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <button onClick={() => applyGradientTheme(GRADIENT_THEMES.Day)} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5">
                            <Sun size={14} className="text-blue-300" />
                            <span className="text-[10px] text-slate-300">Day</span>
                        </button>
                        <button onClick={() => applyGradientTheme(GRADIENT_THEMES.Sunset)} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5">
                            <Sunset size={14} className="text-orange-300" />
                            <span className="text-[10px] text-slate-300">Sunset</span>
                        </button>
                        <button onClick={() => applyGradientTheme(GRADIENT_THEMES.Night)} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5">
                            <Moon size={14} className="text-indigo-300" />
                            <span className="text-[10px] text-slate-300">Night</span>
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                             <label className="text-[10px] text-slate-400 block">Top</label>
                             <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                                <input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer" />
                                <span className="text-[10px] text-slate-300 font-mono truncate">{bgFrom}</span>
                             </div>
                        </div>
                        <div className="flex-1 space-y-1">
                             <label className="text-[10px] text-slate-400 block">Middle</label>
                             <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                                <input type="color" value={bgVia} onChange={(e) => setBgVia(e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer" />
                                <span className="text-[10px] text-slate-300 font-mono truncate">{bgVia}</span>
                             </div>
                        </div>
                        <div className="flex-1 space-y-1">
                             <label className="text-[10px] text-slate-400 block">Bottom</label>
                             <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                                <input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer" />
                                <span className="text-[10px] text-slate-300 font-mono truncate">{bgTo}</span>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                {/* Cloud Controls */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white/90">
                        <Cloud size={16} />
                        <span className="font-semibold text-sm">Cloud Layering</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Coverage</span>
                            <span>{Math.round(cloudCoverage * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={cloudCoverage} onChange={(e) => setCloudCoverage(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />

                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Density</span>
                            <span>{Math.round(cloudDensity * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="1" step="0.05" 
                            value={cloudDensity} onChange={(e) => setCloudDensity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Speed</span>
                            <span>{cloudSpeed.toFixed(2)}</span>
                        </div>
                        <input 
                            type="range" min="0" max="0.2" step="0.01" 
                            value={cloudSpeed} onChange={(e) => setCloudSpeed(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                {/* Atmosphere Controls */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white/90">
                        <Droplets size={16} />
                        <span className="font-semibold text-sm">Atmosphere</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Fog Density</span>
                            <span>{(fogDensity * 1000).toFixed(0)} units</span>
                        </div>
                        <input 
                            type="range" min="0" max="0.3" step="0.005" 
                            value={fogDensity} onChange={(e) => setFogDensity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />

                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Wind Speed</span>
                            <span>{windSpeed} km/h</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="1" 
                            value={windSpeed} onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-white/10 my-4" />
                
                {/* Toggles */}
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsDay(!isDay)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${isDay ? 'bg-amber-500/20 border-amber-500/50 text-amber-100' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}
                    >
                        {isDay ? '☀️ Day Mode' : '🌙 Night Mode'}
                    </button>
                </div>
                 <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Cloud Color</label>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                            <input type="color" value={cloudColor} onChange={(e) => setCloudColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                            <span className="text-xs text-slate-300 font-mono">{cloudColor}</span>
                        </div>
                     </div>
                     <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Fog Color</label>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                            <input type="color" value={fogColor} onChange={(e) => setFogColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                            <span className="text-xs text-slate-300 font-mono">{fogColor}</span>
                        </div>
                     </div>
                </div>

            </div>

            {/* Right Panel: Preview */}
            {/* Changed to allow overflow of 3D labels but keep background clipped */}
            <div className="lg:col-span-8 relative group">
                 {/* Background Wrapper - Clips the grid/bg */}
                 <div className="absolute inset-0 bg-slate-900/30 rounded-3xl border border-white/5 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 </div>

                 {/* Content Wrapper - Allows 3D overflow */}
                 <div className="relative h-full min-h-[800px] flex flex-col items-center justify-center p-8 overflow-visible">
                    <div className="relative z-10 w-full max-w-xl transition-all duration-500">
                        <WeatherCard 
                            data={studioCity} 
                            index={0} 
                            isDemo={true} 
                            customCloudConfig={cloudConfig}
                            customData={studioCity}
                            customGradient={customGradient}
                            showLayers={showLayers}
                        />
                    </div>

                    {/* Status Bar */}
                    <div className="absolute bottom-6 left-0 right-0 text-center space-y-2 pointer-events-none">
                        <div className="text-xs font-mono text-indigo-300 opacity-60 uppercase tracking-widest">
                            Rendering Real-time • WebGL 2.0
                        </div>
                        <p className="text-[10px] text-slate-500">
                            {showLayers ? "Displaying Z-Index Layers" : "Standard Composite View"}
                        </p>
                    </div>
                 </div>
            </div>

        </div>
    );
};

export default DesignStudio;
