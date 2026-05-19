# 🌍 World Live Tracker — k3s Branch

> Local homelab deployment of World Live Tracker on a self-hosted k3s cluster.
> For the AWS EKS version see the [`main`](https://github.com/marius-org/world-tracker/tree/main) branch.

🗺️ **Live:** [world.slax.ro](https://world.slax.ro)

---

## What's Different From `main`

| | `main` (AWS) | `k3s` (this branch) |
|---|---|---|
| Infra | AWS EKS + Terraform | Self-hosted k3s homelab |
| Pipeline | 4 jobs: build → terraform → deploy → ansible | 2 jobs: build → ArgoCD GitOps |
| Ingress | AWS NLB | ingress-nginx + MetalLB + Cloudflare Tunnel |
| Domain | AWS ELB hostname | world.slax.ro |
| Flights API | Browser-side proxy (AWS IP blocked) | Server-side proxy (home IP works) |
| UI | Original | Redesigned — radar/aviation aesthetic |
| Performance | — | Flight cache 30s + capped at 3,000 aircraft |

---

## Architecture

```
Proxmox Homelab
└── devops-project (192.168.1.59) — development VM, runs pipeline

k3s HA Cluster (pve12)
├── control-node  192.168.1.50  — control plane, GitHub Actions runner, ArgoCD
├── k3s-master-01 192.168.1.51
├── k3s-master-02 192.168.1.52
├── k3s-master-03 192.168.1.53
├── k3s-worker-01 192.168.1.54
└── k3s-worker-02 192.168.1.55

Traffic Flow
Internet → Cloudflare Tunnel → ingress-nginx (MetalLB) → world-tracker-service (ClusterIP) → pod
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python / FastAPI |
| Frontend | Leaflet.js + Vanilla JS (radar aesthetic) |
| Containerization | Docker |
| Container registry | Docker Hub (`mariuseu/world-tracker`) |
| CI/CD | GitHub Actions (self-hosted runner on `control-node`) |
| GitOps | ArgoCD |
| Orchestration | k3s HA cluster |
| Ingress | ingress-nginx + MetalLB + Cloudflare Tunnel |
| Domain | world.slax.ro |

---

## Project Structure

```
world-tracker/
├── app/
│   ├── main.py                # FastAPI backend (flights cache + 3k limit)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── static/
│       ├── index.html         # Redesigned radar UI
│       ├── style.css
│       └── app.js             # Cluster rendering + zoom-based icons
├── k3s/
│   ├── namespace.yml
│   ├── deployment.yml         # Deployment + Service (ClusterIP)
│   └── ingress.yml            # world.slax.ro ingress rule
├── ansible/
│   └── playbooks/
│       └── smoke-test.yml
└── .github/
    └── workflows/
        ├── deploy.yml          # main branch → AWS EKS
        └── deploy-k3s.yml      # k3s branch → homelab
```

---

## CI/CD Pipeline

Every push to `k3s` (excluding `k3s/**` and `*.md`) triggers:

```
git push → deploy-k3s.yml (runs on control-node)
    │
    ├── Job 1: Build & Push
    │     └── docker build → mariuseu/world-tracker:k3s-<run> + k3s-latest
    │
    └── Job 2: (ArgoCD)
          └── sed image tag in k3s/deployment.yml → commit → push
                └── ArgoCD detects change → auto-sync → k3s cluster
```

---

## Application Features

- **✈️ Live Flights** — Up to 3,000 aircraft, cached 30s, clustered rendering
- **🌋 Earthquakes** — Last 24h seismic activity with magnitude scale (USGS)
- **🌤️ Weather** — Click anywhere on the map for local weather (Open-Meteo)

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Web dashboard |
| `/health` | GET | Liveness probe |
| `/info` | GET | Pod hostname, version, environment |
| `/api/flights` | GET | Live flights (cached 30s, max 3,000) |
| `/api/earthquakes` | GET | Earthquake data (USGS) |
| `/api/weather?lat=&lon=` | GET | Weather at coordinates (Open-Meteo) |

---

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
