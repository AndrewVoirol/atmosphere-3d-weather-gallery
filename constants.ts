import { CityWeather, ForecastDay } from './types';

const RAW_DATA = [
  {
    "id": 1,
    "city": "Los Angeles",
    "country": "US",
    "timezone": "America/Los_Angeles",
    "coords": { "lat": 34.0549, "lon": -118.2426 },
    "placeholderData": {
      "temp_c": 24,
      "condition": "Sunny",
      "icon_slug": "clear-day",
      "humidity": 40,
      "wind_kph": 12
    }
  },
  {
    "id": 2,
    "city": "New York",
    "country": "US",
    "timezone": "America/New_York",
    "coords": { "lat": 40.7128, "lon": -74.0060 },
    "placeholderData": {
      "temp_c": 13,
      "condition": "Partly Cloudy",
      "icon_slug": "partly-cloudy-day",
      "humidity": 55,
      "wind_kph": 18
    }
  },
  {
    "id": 3,
    "city": "Rio de Janeiro",
    "country": "BR",
    "timezone": "America/Sao_Paulo",
    "coords": { "lat": -22.9068, "lon": -43.1729 },
    "placeholderData": {
      "temp_c": 29,
      "condition": "Humid / Clear",
      "icon_slug": "clear-day",
      "humidity": 82,
      "wind_kph": 15
    }
  },
  {
    "id": 4,
    "city": "Reykjavik",
    "country": "IS",
    "timezone": "Atlantic/Reykjavik",
    "coords": { "lat": 64.1265, "lon": -21.8174 },
    "placeholderData": {
      "temp_c": 2,
      "condition": "Light Snow",
      "icon_slug": "snow",
      "humidity": 70,
      "wind_kph": 35
    }
  },
  {
    "id": 5,
    "city": "London",
    "country": "GB",
    "timezone": "Europe/London",
    "coords": { "lat": 51.5074, "lon": -0.1278 },
    "placeholderData": {
      "temp_c": 11,
      "condition": "Drizzle",
      "icon_slug": "rain",
      "humidity": 88,
      "wind_kph": 22
    }
  },
  {
    "id": 6,
    "city": "Dubai",
    "country": "AE",
    "timezone": "Asia/Dubai",
    "coords": { "lat": 25.2048, "lon": 55.2708 },
    "placeholderData": {
      "temp_c": 39,
      "condition": "Extreme Heat",
      "icon_slug": "clear-day-hot",
      "humidity": 25,
      "wind_kph": 10
    }
  },
  {
    "id": 7,
    "city": "Mumbai",
    "country": "IN",
    "timezone": "Asia/Kolkata",
    "coords": { "lat": 19.0760, "lon": 72.8777 },
    "placeholderData": {
      "temp_c": 32,
      "condition": "Haze",
      "icon_slug": "fog",
      "humidity": 75,
      "wind_kph": 8
    }
  },
  {
    "id": 8,
    "city": "Singapore",
    "country": "SG",
    "timezone": "Asia/Singapore",
    "coords": { "lat": 1.3521, "lon": 103.8198 },
    "placeholderData": {
      "temp_c": 28,
      "condition": "Thunderstorm",
      "icon_slug": "thunderstorm",
      "humidity": 92,
      "wind_kph": 14
    }
  },
  {
    "id": 9,
    "city": "Sydney",
    "country": "AU",
    "timezone": "Australia/Sydney",
    "coords": { "lat": -33.8688, "lon": 151.2093 },
    "placeholderData": {
      "temp_c": 19,
      "condition": "Partly Cloudy",
      "icon_slug": "partly-cloudy-night",
      "humidity": 60,
      "wind_kph": 28
    }
  }
];

export const getIcon = (slug: string) => {
  const map: Record<string, string> = {
    'clear-day': '☀️',
    'partly-cloudy-day': '⛅',
    'clear-day-hot': '🔥',
    'snow': '❄️',
    'rain': '🌧️',
    'fog': '🌫️',
    'overcast': '☁️',
    'thunderstorm': '⛈️',
    'partly-cloudy-night': '🌙',
    'clear-night': '🌕',
  };
  return map[slug] || '☁️';
};

export const getMoonPhase = (date: Date = new Date()) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month < 3) { year--; month += 12; }
  const c = 365.25 * year;
  const e = 30.6 * month;
  const jd = c + e + day - 694039.09; 
  const b = jd / 29.5305882;
  return b - Math.floor(b);
};

export const getMoonPhaseDetails = (phase: number) => {
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  let name = '';
  if (phase < 0.03 || phase > 0.97) name = 'New Moon';
  else if (phase < 0.23) name = 'Waxing Crescent';
  else if (phase < 0.27) name = 'First Quarter';
  else if (phase < 0.48) name = 'Waxing Gibbous';
  else if (phase < 0.53) name = 'Full Moon';
  else if (phase < 0.73) name = 'Waning Gibbous';
  else if (phase < 0.77) name = 'Last Quarter';
  else name = 'Waning Crescent';
  return { name, illumination };
};

// UPDATED STRATEGY: Brighter, more visible gradients for mobile/dark mode.
export const getTheme = (isDay: boolean, condition: string, tempC: number, humidity: number = 50) => {
  
  // 1. Night Mode
  if (!isDay) {
    if (['thunderstorm'].includes(condition)) {
        // Slightly brighter Violet for visibility
        return { from: 'from-indigo-900', via: 'via-purple-800', to: 'to-violet-950' };
    }
    if (['clear-night'].includes(condition)) {
        // Lighter Blue-Black
        return { from: 'from-blue-900', via: 'via-indigo-900', to: 'to-slate-900' };
    }
    // General Night
    return { from: 'from-slate-900', via: 'via-indigo-900', to: 'to-blue-950' };
  }

  // 2. Distinct Weather Conditions (Daytime)
  if (['thunderstorm'].includes(condition)) {
     // Brighter Electric Indigo
     return { from: 'from-indigo-600', via: 'via-purple-600', to: 'to-slate-700' };
  }
  if (['rain', 'drizzle', 'showers'].includes(condition)) {
    // Brighter Teal/Blue
    return { from: 'from-cyan-600', via: 'via-blue-600', to: 'to-slate-600' };
  }
  if (['snow', 'blizzard'].includes(condition)) {
    // Brighter Cyan/White
    return { from: 'from-sky-300', via: 'via-cyan-200', to: 'to-blue-200' };
  }
  if (['overcast', 'fog'].includes(condition)) {
    // Brighter Grey
    return { from: 'from-slate-400', via: 'via-zinc-300', to: 'to-stone-300' };
  }

  // 3. Temperature Gradient (Daytime)
  if (tempC >= 30) {
    // Hot: Brighter Orange/Red
    return { from: 'from-orange-400', via: 'via-red-500', to: 'to-yellow-500' };
  }
  if (tempC >= 22) {
    // Warm: Brighter Pink/Purple
    return { from: 'from-blue-400', via: 'via-violet-400', to: 'to-fuchsia-400' };
  }
  if (tempC >= 15) {
    // Mild: Brighter Emerald
    return { from: 'from-emerald-400', via: 'via-teal-400', to: 'to-cyan-400' };
  }
  
  // Cool/Default: Brighter Sky Blue
  return { from: 'from-blue-400', via: 'via-sky-400', to: 'to-indigo-400' };
};

const generateMockForecast = (baseTempF: number, baseIcon: string): ForecastDay[] => {
  return [
    { day: 'Today', icon: baseIcon, high: baseTempF, low: baseTempF - 12 },
    { day: 'Tomorrow', icon: getIcon('partly-cloudy-day'), high: baseTempF + 2, low: baseTempF - 10 },
    { day: 'Wed', icon: getIcon('rain'), high: baseTempF - 5, low: baseTempF - 15 },
    { day: 'Thu', icon: getIcon('clear-day'), high: baseTempF + 5, low: baseTempF - 8 },
  ];
};

export const CITIES: CityWeather[] = RAW_DATA.map((city) => {
  const icon = getIcon(city.placeholderData.icon_slug);
  const tempF = Math.round((city.placeholderData.temp_c * 9 / 5) + 32);
  
  const forecast = [
    { day: 'Today', icon: icon, high: tempF, low: tempF - 9 },
    { day: 'Fri', icon: getIcon('partly-cloudy-day'), high: tempF + 3, low: tempF - 7 },
    { day: 'Sat', icon: getIcon('rain'), high: tempF - 4, low: tempF - 12 },
    { day: 'Sun', icon: getIcon('clear-day'), high: tempF + 4, low: tempF - 5 },
  ];

  return {
    ...city,
    theme: getTheme(true, city.placeholderData.icon_slug, city.placeholderData.temp_c, city.placeholderData.humidity),
    icon: icon,
    forecast,
    sunrise: '6:30 AM',
    sunset: '7:00 PM',
    dayLength: '12h 30m',
    precipChance: city.placeholderData.humidity > 80 ? 80 : 10,
    isDay: true 
  };
});

export const SAMPLE_CITIES: CityWeather[] = [
  {
    id: 101, city: "Seattle Storm", country: "US", timezone: "America/Los_Angeles",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 12, condition: "Heavy Rain", icon_slug: "rain", humidity: 90, wind_kph: 25 },
    theme: getTheme(true, 'rain', 12, 90), icon: getIcon('rain'),
    forecast: generateMockForecast(54, getIcon('rain')),
    sunrise: "06:12 AM", sunset: "07:45 PM", dayLength: "13h 33m", precipChance: 100, isDay: true
  },
  {
    id: 102, city: "Anchorage Blizzard", country: "US", timezone: "America/Anchorage",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: -5, condition: "Blizzard", icon_slug: "snow", humidity: 80, wind_kph: 40 },
    theme: getTheme(true, 'snow', -5, 80), icon: getIcon('snow'),
    forecast: generateMockForecast(23, getIcon('snow')),
    sunrise: "09:30 AM", sunset: "04:15 PM", dayLength: "6h 45m", precipChance: 95, isDay: true
  },
  {
    id: 103, city: "Dubai Heatwave", country: "AE", timezone: "Asia/Dubai",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 42, condition: "Scorching", icon_slug: "clear-day-hot", humidity: 15, wind_kph: 10 },
    theme: getTheme(true, 'clear-day-hot', 42, 15), icon: getIcon('clear-day-hot'),
    forecast: generateMockForecast(108, getIcon('clear-day-hot')),
    sunrise: "05:45 AM", sunset: "06:30 PM", dayLength: "12h 45m", precipChance: 0, isDay: true
  },
  {
    id: 104, city: "London Fog", country: "GB", timezone: "Europe/London",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 8, condition: "Dense Fog", icon_slug: "fog", humidity: 95, wind_kph: 5 },
    theme: getTheme(true, 'fog', 8, 95), icon: getIcon('fog'),
    forecast: generateMockForecast(46, getIcon('fog')),
    sunrise: "07:10 AM", sunset: "05:50 PM", dayLength: "10h 40m", precipChance: 20, isDay: true
  },
  {
    id: 105, city: "Tokyo Night", country: "JP", timezone: "Asia/Tokyo",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 18, condition: "Clear Night", icon_slug: "clear-night", humidity: 60, wind_kph: 12 },
    theme: getTheme(false, 'clear-night', 18, 60), icon: getIcon('clear-night'),
    forecast: generateMockForecast(65, getIcon('clear-day')),
    sunrise: "05:20 AM", sunset: "06:10 PM", dayLength: "12h 50m", precipChance: 5, isDay: false
  },
  {
    id: 106, city: "Singapore Thunder", country: "SG", timezone: "Asia/Singapore",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 30, condition: "Thunderstorm", icon_slug: "thunderstorm", humidity: 90, wind_kph: 20 },
    theme: getTheme(true, 'thunderstorm', 30, 90), icon: getIcon('thunderstorm'),
    forecast: generateMockForecast(86, getIcon('thunderstorm')),
    sunrise: "06:50 AM", sunset: "07:00 PM", dayLength: "12h 10m", precipChance: 90, isDay: true
  },
  {
    id: 107, city: "Hawaii Sunset", country: "US", timezone: "Pacific/Honolulu",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 27, condition: "Partly Cloudy", icon_slug: "partly-cloudy-day", humidity: 65, wind_kph: 15 },
    theme: getTheme(true, 'partly-cloudy-day', 27, 65), icon: getIcon('partly-cloudy-day'),
    forecast: generateMockForecast(80, getIcon('partly-cloudy-day')),
    sunrise: "06:15 AM", sunset: "06:45 PM", dayLength: "12h 30m", precipChance: 10, isDay: true
  },
  {
    id: 108, city: "Berlin Overcast", country: "DE", timezone: "Europe/Berlin",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 14, condition: "Overcast", icon_slug: "overcast", humidity: 75, wind_kph: 18 },
    theme: getTheme(true, 'overcast', 14, 75), icon: getIcon('overcast'),
    forecast: generateMockForecast(57, getIcon('overcast')),
    sunrise: "06:45 AM", sunset: "07:30 PM", dayLength: "12h 45m", precipChance: 15, isDay: true
  },
  {
    id: 109, city: "Sydney Rainy Night", country: "AU", timezone: "Australia/Sydney",
    coords: { lat: 0, lon: 0 },
    placeholderData: { temp_c: 16, condition: "Showers", icon_slug: "rain", humidity: 85, wind_kph: 22 },
    theme: getTheme(false, 'rain', 16, 85), icon: getIcon('rain'),
    forecast: generateMockForecast(61, getIcon('rain')),
    sunrise: "06:00 AM", sunset: "05:30 PM", dayLength: "11h 30m", precipChance: 80, isDay: false
  },
];