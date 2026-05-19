from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import socket
import sys
import os

app = FastAPI(title="World Live Tracker", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

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
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://opensky-network.org/api/states/all"
        )
        return response.json()

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
