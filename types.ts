
export interface ForecastDay {
  day: string;
  icon: string;
  high: number;
  low: number;
}

export interface CityWeather {
  id: number;
  city: string;
  country: string;
  timezone: string;
  coords: {
    lat: number;
    lon: number;
  };
  placeholderData: {
    temp_c: number;
    condition: string;
    icon_slug: string;
    humidity: number;
    wind_kph: number;
  };
  // Enriched UI properties
  theme: {
    from: string;
    via: string;
    to: string;
  };
  icon: string; // Main display emoji
  forecast: ForecastDay[];
  sunrise: string;
  sunset: string;
  dayLength: string;
  precipChance: number;
  isDay: boolean; // Tracks if it is currently daytime in the city
}
