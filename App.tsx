import React, { useState, useRef } from 'react';
import { CITIES, SAMPLE_CITIES } from './constants';
import WeatherCard from './components/WeatherCard';
import DesignStudio from './components/DesignStudio';
import { GlobeLogo } from './components/GlobeLogo';
import { LayoutDashboard, PenTool, Sparkles, Loader2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import { GoogleGenAI, Type } from "@google/genai";
import { CityWeather, ForecastDay } from './types';
import { getTheme, getIcon } from './constants';

// Helper to hydrate raw AI data into full UI objects
const hydrateWeatherData = (rawData: any[], startIndex: number): CityWeather[] => {
  return rawData.map((item, i) => {
    const tempF = Math.round((item.temp_c * 9 / 5) + 32);
    const icon = getIcon(item.icon_slug);
    
    // Generate a consistent mock forecast based on the current temp
    const forecast: ForecastDay[] = [
      { day: 'Today', icon: icon, high: tempF, low: tempF - 10 },
      { day: 'Tomorrow', icon: icon, high: tempF + 2, low: tempF - 8 },
      { day: 'Wed', icon: getIcon('partly-cloudy-day'), high: tempF - 2, low: tempF - 12 },
      { day: 'Thu', icon: getIcon('clear-day'), high: tempF + 5, low: tempF - 5 },
    ];

    // Calculate a theme based on the generated data
    const theme = getTheme(item.is_day, item.icon_slug, item.temp_c, item.humidity);

    return {
      id: startIndex + i,
      city: item.city,
      country: item.country,
      timezone: "UTC", // Placeholder
      coords: { lat: 0, lon: 0 }, // Placeholder for 3D calculations if needed later
      placeholderData: {
        temp_c: item.temp_c,
        condition: item.condition,
        icon_slug: item.icon_slug,
        humidity: item.humidity,
        wind_kph: item.wind_kph,
      },
      theme,
      icon,
      forecast,
      sunrise: "06:00 AM",
      sunset: "07:30 PM",
      dayLength: "13h 30m",
      precipChance: item.humidity > 70 ? 60 : 10,
      isDay: item.is_day
    };
  });
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'feed' | 'studio'>('feed');
  // Default to SAMPLE_CITIES for "fun" demo data
  const [locations, setLocations] = useState<CityWeather[]>(SAMPLE_CITIES);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      const systemInstruction = `
        You are a creative weather engine. Generate 9 unique, distinct locations based on the user's theme.
        The theme can be realistic (e.g., "Tropical Islands"), fictional (e.g., "Lord of the Rings Locations"), or sci-fi (e.g., "Cyberpunk Cities", "Mars Colonies").
        
        Return a JSON array of 9 objects with these fields:
        - city: string
        - country: string (or planet/region)
        - temp_c: number (appropriate for the location/theme)
        - condition: string (short text, e.g., "Neon Rain", "Dust Storm", "Sunny")
        - humidity: number (0-100)
        - wind_kph: number (0-100)
        - is_day: boolean
        - icon_slug: string (Must be one of: 'clear-day', 'partly-cloudy-day', 'clear-day-hot', 'snow', 'rain', 'fog', 'overcast', 'thunderstorm', 'partly-cloudy-night', 'clear-night')

        Ensure variety in weather conditions and temperatures.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Theme: ${aiPrompt}`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                city: { type: Type.STRING },
                country: { type: Type.STRING },
                temp_c: { type: Type.NUMBER },
                condition: { type: Type.STRING },
                humidity: { type: Type.NUMBER },
                wind_kph: { type: Type.NUMBER },
                is_day: { type: Type.BOOLEAN },
                icon_slug: { type: Type.STRING, enum: ['clear-day', 'partly-cloudy-day', 'clear-day-hot', 'snow', 'rain', 'fog', 'overcast', 'thunderstorm', 'partly-cloudy-night', 'clear-night'] },
              },
              required: ['city', 'country', 'temp_c', 'condition', 'humidity', 'wind_kph', 'is_day', 'icon_slug']
            }
          }
        }
      });

      if (response.text) {
        const rawData = JSON.parse(response.text);
        const newLocations = hydrateWeatherData(rawData, Date.now());
        setLocations(newLocations);
      }
    } catch (error) {
      console.error("Failed to generate locations", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1a1a4e] to-slate-900 text-slate-200 relative overflow-y-auto overflow-x-hidden"
    >
      {/* Shared Global Canvas */}
      <Canvas
        eventSource={containerRef}
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
      >
        <View.Port />
      </Canvas>

      {/* Header */}
      <header className="relative z-10 p-6 md:px-10 md:py-8 flex flex-col xl:flex-row justify-between items-center max-w-7xl mx-auto border-b border-white/5 mb-6 gap-6">
        <div className="flex items-center space-x-5 mb-4 md:mb-0 shrink-0">
          {/* Animated Globe Logo */}
          <GlobeLogo size={60} className="shrink-0" />
          
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Atmosphere</h1>
            <p className="text-sm text-blue-200/60 font-light tracking-wider uppercase">Global Forecast Dashboard</p>
          </div>
        </div>
        
        {/* AI Command Center */}
        {viewMode === 'feed' && (
          <div className="w-full max-w-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form onSubmit={handleGenerate} className="relative flex items-center bg-slate-900/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="pl-4 text-slate-400">
                <Sparkles size={18} className={isGenerating ? "animate-pulse text-purple-400" : ""} />
              </div>
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask AI for a location list... (e.g., 'Cyberpunk Cities', 'Mars Colonies')"
                className="w-full bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder:text-slate-500"
                disabled={isGenerating}
              />
              <button 
                type="submit"
                disabled={isGenerating}
                className="mr-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-xs font-medium uppercase tracking-wider border border-white/5"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center gap-4 shrink-0">
           <div className="flex items-center gap-1 bg-black/20 rounded-full p-1 border border-white/10 backdrop-blur-md">
             <button 
               onClick={() => setViewMode('feed')}
               className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${viewMode === 'feed' ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
             >
               <LayoutDashboard size={16} />
               Feed
             </button>
             <button 
               onClick={() => setViewMode('studio')}
               className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${viewMode === 'studio' ? 'bg-amber-600 text-white shadow-lg ring-1 ring-amber-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
             >
               <PenTool size={16} />
               Studio
             </button>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto min-h-[80vh]">
        {viewMode === 'feed' ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {locations.map((city, index) => (
                <WeatherCard 
                  key={`${city.id}-${index}`} 
                  data={city} 
                  index={index} 
                />
              ))}
            </div>
        ) : (
            <DesignStudio />
        )}
      </main>
      
      <footer className="relative z-10 text-center py-10 opacity-30 text-xs font-light">
        <p>© 2025 Atmosphere Weather. Designed with React Three Fiber & Tailwind.</p>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;