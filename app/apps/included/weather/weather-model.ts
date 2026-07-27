export type WeatherMode = 'day' | 'night';

export type WeatherConditionKey = 'clear' | 'cloudy' | 'snow' | 'rain' | 'fog' | 'default';
export type WeatherForecastIconKey = 'sun' | 'cloud' | 'snow' | 'rain';

export type WeatherMapLinks = {
  mapUrl: string;
  precipUrl: string;
  yandexNowcastUrl: string;
  yandexWeatherUrl: string;
};

export type WeatherForecastDay = {
  temp: number;
  weatherKey: WeatherConditionKey;
};

export type WeatherForecastHour = {
  time: string;
  temp: number;
  weather: string;
  weatherKey: WeatherConditionKey;
};

export type WeatherAstroData = {
  sunrise: string;
  sunset: string;
  uvIndex: number;
  uvText: string;
  moonPhase: string;
  moonVal: number;
};

export type WeatherDetailsData = {
  humidity: number;
  pressure: number;
  windSpeed: number;
  visibility: number;
};

export type WeatherAppData = {
  astro?: WeatherAstroData;
  city: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  country: string;
  days: WeatherForecastDay[];
  details?: WeatherDetailsData;
  hourly?: WeatherForecastHour[];
  maxTemp: number;
  minTemp: number;
  mornight: string;
  temp: number;
  weather: string;
  weatherKey: WeatherConditionKey;
};

export const weatherRules: Array<{ key: WeatherConditionKey; words: string[] }> = [
  { key: 'cloudy', words: ['обл', 'пасму', 'пасмур', 'cloud', 'overcast'] },
  { key: 'snow', words: ['снег', 'snow'] },
  { key: 'rain', words: ['дожд', 'ливе', 'rain', 'drizzle', 'гроза', 'lightning', 'thunder', 'storm'] },
  { key: 'fog', words: ['туман', 'fog', 'mist', 'haze'] },
  { key: 'clear', words: ['ясн', 'clear', 'sun'] },
];

export function detectWeatherKey(description: string | null | undefined): WeatherConditionKey {
  const normalized = (description ?? '').toLowerCase();

  for (const rule of weatherRules) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return rule.key;
    }
  }

  return 'default';
}

export function isDayTime(date = new Date()) {
  const hours = date.getHours();
  return hours >= 6 && hours < 18;
}

export function latLonToTile(lat: number, lon: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xTile = Math.floor(((lon + 180) / 360) * n);
  const yTile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

  return { xTile, yTile };
}

export function buildWeatherMedia(mode: WeatherMode, weatherKey: WeatherConditionKey) {
  if (weatherKey === 'default') {
    return {
      backgroundImageUrl: `/img/weather/newweather/bg/${mode}/default.webp`,
      videoUrl: null,
    };
  }

  return {
    backgroundImageUrl: null,
    videoUrl: `/img/weather/newweather/video/${weatherKey}-${mode}.webm`,
  };
}

export function getForecastIconKey(weatherKey: WeatherConditionKey): WeatherForecastIconKey {
  if (weatherKey === 'snow') {
    return 'snow';
  }

  if (weatherKey === 'rain') {
    return 'rain';
  }

  if (weatherKey === 'cloudy' || weatherKey === 'fog') {
    return 'cloud';
  }

  return 'sun';
}

export function buildWeatherMapLinks(
  lat: number,
  lon: number,
  isDay: boolean,
  locale: 'ru' | 'en',
): WeatherMapLinks {
  const zoom = 9;
  const { xTile, yTile } = latLonToTile(lat, lon, zoom);
  const mapUrl = isDay
    ? `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`
    : `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${zoom}/${xTile}/${yTile}.png`;
  const precipUrl = `https://tile.openweathermap.org/map/precipitation_new/${zoom}/${xTile}/${yTile}.png?appid=1c503419b342442e86e7eccfc16a85c7`;
  const yandexWeatherUrl =
    locale === 'ru'
      ? `https://yandex.ru/pogoda/ru?lat=${lat}&lon=${lon}`
      : `https://yandex.com/weather/en?lat=${lat}&lon=${lon}`;
  const yandexNowcastUrl =
    locale === 'ru'
      ? `https://yandex.ru/pogoda/ru/maps/nowcast?lat=${lat}&lon=${lon}`
      : `https://yandex.com/weather/en/maps/nowcast?lat=${lat}&lon=${lon}`;

  return { mapUrl, precipUrl, yandexNowcastUrl, yandexWeatherUrl };
}

export function getDayOfMonthAfter(offsetDays: number, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + offsetDays);
  return date.getDate();
}
