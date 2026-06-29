"use client";

import { useState } from "react";
import { Cloud, Wind, Droplets, Eye, Sun, Thermometer, Save } from "lucide-react";

type WeatherData = {
  tempF: string;
  tempC: string;
  feelsLikeF: string;
  description: string;
  humidity: string;
  windMph: string;
  windDir: string;
  visibility: string;
  uvIndex: string;
  fetchedAt: string;
  address: string;
};

type Props = {
  appointmentId: string;
  address: string;
  initialWeather?: WeatherData | null;
};

export function WeatherWidget({ appointmentId, address, initialWeather }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialWeather);
  const [error, setError] = useState("");

  const fetchWeather = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/weather?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Weather unavailable");
      setWeather(data.data);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  };

  const saveWeather = async () => {
    if (!weather) return;
    setSaving(true);
    try {
      await fetch(`/api/appointments/${appointmentId}/weather`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weatherData: weather }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const getWeatherIcon = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("rain") || d.includes("drizzle")) return "🌧";
    if (d.includes("snow")) return "❄️";
    if (d.includes("storm") || d.includes("thunder")) return "⛈";
    if (d.includes("fog") || d.includes("mist")) return "🌫";
    if (d.includes("cloud")) return "☁️";
    if (d.includes("clear") || d.includes("sunny")) return "☀️";
    if (d.includes("partly")) return "⛅";
    return "🌤";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Cloud className="h-4 w-4" /> Job Site Weather
        </h2>
        <button
          onClick={fetchWeather}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? "Fetching…" : weather ? "Refresh" : "Get Weather"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive mb-2">{error}</p>
      )}

      {!weather && !loading && (
        <p className="text-sm text-muted-foreground">
          Click "Get Weather" to pull the current forecast for {address}.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Cloud className="h-4 w-4" /> Fetching weather…
        </div>
      )}

      {weather && (
        <>
          <div className="flex items-start gap-4">
            {/* Main temp */}
            <div className="text-center shrink-0">
              <div className="text-4xl">{getWeatherIcon(weather.description)}</div>
              <div className="text-3xl font-bold text-foreground">{weather.tempF}°F</div>
              <div className="text-xs text-muted-foreground">{weather.tempC}°C</div>
            </div>

            {/* Details grid */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Thermometer className="h-3 w-3 shrink-0" />
                <span>Feels like <strong className="text-foreground">{weather.feelsLikeF}°F</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Droplets className="h-3 w-3 shrink-0" />
                <span>Humidity <strong className="text-foreground">{weather.humidity}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wind className="h-3 w-3 shrink-0" />
                <span>Wind <strong className="text-foreground">{weather.windMph} mph {weather.windDir}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3 w-3 shrink-0" />
                <span>Visibility <strong className="text-foreground">{weather.visibility} mi</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
                <Sun className="h-3 w-3 shrink-0" />
                <span><strong className="text-foreground">{weather.description}</strong> · UV {weather.uvIndex}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {saved ? "Saved to job" : "Not saved yet"} · {new Date(weather.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
            {!saved && (
              <button
                onClick={saveWeather}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {saving ? "Saving…" : "Save to Job"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
