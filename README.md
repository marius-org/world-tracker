# 🌍 World Live Tracker

A real-time world map dashboard built with FastAPI and Leaflet.js.

## Features
- ✈️ Live flight tracking (OpenSky Network)
- 🌋 Real-time earthquake data (USGS)
- 🌤️ Weather on click (Open-Meteo)

## Tech Stack
- Python / FastAPI
- Docker
- Kubernetes (AWS EKS)
- Terraform
- Ansible
- GitHub Actions

## Endpoints
- `/` - Web dashboard
- `/health` - Kubernetes liveness probe
- `/info` - Pod information
- `/api/flights` - Live flights proxy
- `/api/earthquakes` - Earthquake data proxy
- `/api/weather` - Weather data proxy
