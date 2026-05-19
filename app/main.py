from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import socket
import sys
import os
import time

app = FastAPI(title="World Live Tracker", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Cache ────────────────────────────────────────────────────────────────────

_flights_cache = {"data": None, "ts": 0}
CACHE_TTL = 30        # seconds
MAX_AIRCRAFT = 3000   # cap to keep browser smooth

# ── Root ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return FileResponse("static/index.html")

# ── Health & Info ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/info")
async def info():
    return {
        "app": "World Live Tracker",
        "version": "1.0.0",
        "hostname": socket.gethostname(),
        "python_version": sys.version,
        "environment": os.getenv("ENVIRONMENT", "production")
    }

# ── API Proxies ───────────────────────────────────────────────────────────────

@app.get("/api/flights")
async def get_flights():
    now = time.time()
    if _flights_cache["data"] and now - _flights_cache["ts"] < CACHE_TTL:
        return _flights_cache["data"]

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://opensky-network.org/api/states/all"
        )
        data = response.json()
        if "states" in data and data["states"]:
            data["states"] = data["states"][:MAX_AIRCRAFT]
        _flights_cache["data"] = data
        _flights_cache["ts"] = now
        return data

@app.get("/api/earthquakes")
async def get_earthquakes():
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
        )
        return response.json()

@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current_weather": True,
                "hourly": "temperature_2m,windspeed_10m"
            }
        )
        return response.json()
