import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  try {
    const url = `https://wttr.in/${encodeURIComponent(address)}?format=j1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FieldDetect-App/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`wttr.in returned ${res.status}`);
    const data = await res.json();
    const current = data?.current_condition?.[0];
    if (!current) throw new Error("No weather data");

    return NextResponse.json({
      data: {
        tempF: current.temp_F,
        tempC: current.temp_C,
        feelsLikeF: current.FeelsLikeF,
        description: current.weatherDesc?.[0]?.value ?? "Unknown",
        humidity: current.humidity,
        windMph: current.windspeedMiles,
        windDir: current.winddir16Point,
        visibility: current.visibility,
        uvIndex: current.uvIndex,
        fetchedAt: new Date().toISOString(),
        address,
      },
    });
  } catch (err) {
    console.error("[WEATHER_GET]", err);
    return NextResponse.json({ error: "Could not fetch weather data" }, { status: 502 });
  }
}
