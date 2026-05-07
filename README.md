# 🌍 World Live Tracker — DevOps Final Project

A real-time world map dashboard built with FastAPI and Leaflet.js, fully automated from local development to AWS EKS deployment using a complete DevOps toolchain.

---

## 📋 Project Overview

This project demonstrates a complete DevOps pipeline — from provisioning a fresh local VM to deploying a live application on AWS Elastic Kubernetes Service (EKS). Every step is automated using industry-standard tools.

---

## 🏗️ Architecture

    Local Infrastructure (Proxmox)
    ├── ansible-ctrl  (192.168.1.58)  — Ansible control node
    └── devops-project (192.168.1.59) — Development VM

    CI/CD Pipeline (GitHub Actions)
    ├── Job 1: Build Docker image → push to Docker Hub
    ├── Job 2: Terraform → provision AWS VPC + EKS
    ├── Job 3: kubectl → deploy to Kubernetes
    └── Job 4: Ansible → smoke test live app

    AWS Infrastructure (eu-west-1 — Ireland)
    ├── VPC with public and private subnets across 3 AZs
    ├── EKS Cluster (Kubernetes 1.32)
    ├── Managed Node Group (t3.small)
    └── Network Load Balancer (public endpoint)

---

## 🛠️ Tech Stack

| Tool | Purpose |
|---|---|
| Python / FastAPI | Web application backend |
| Leaflet.js | Interactive world map frontend |
| Docker | Application containerization |
| Docker Hub | Container image registry |
| Git / GitHub | Source control |
| GitHub Actions | CI/CD pipeline orchestration |
| Ansible | VM provisioning + smoke testing |
| Terraform | AWS infrastructure as code |
| Kubernetes (EKS) | Container orchestration on AWS |
| AWS VPC | Network isolation |
| AWS NLB | Public load balancing |

---

## 📁 Project Structure

    world-tracker/
    ├── app/
    │   ├── main.py                   # FastAPI routes and API proxies
    │   ├── requirements.txt          # Python dependencies
    │   ├── Dockerfile                # Multi-stage Docker build
    │   └── static/
    │       ├── index.html            # Frontend HTML
    │       ├── style.css             # Dark theme styling
    │       └── app.js                # Map logic and API calls
    │
    ├── ansible/
    │   └── playbooks/
    │       └── smoke-test.yml        # Post-deploy health verification
    │
    ├── terraform/
    │   ├── main.tf                   # Provider and S3 backend config
    │   ├── variables.tf              # Input variables
    │   ├── vpc.tf                    # VPC, subnets, NAT gateway
    │   ├── eks.tf                    # EKS cluster and node group
    │   └── outputs.tf                # Output values
    │
    ├── k8s/
    │   ├── namespace.yml             # Dedicated namespace
    │   ├── configmap.yml             # Environment configuration
    │   ├── deployment.yml            # Pod deployment spec
    │   └── service.yml               # LoadBalancer service
    │
    └── .github/
        └── workflows/
            └── deploy.yml            # Full CI/CD pipeline

---

## 🚀 Pipeline Flow

Every `git push` to `main` triggers the full pipeline:

    git push → main
        │
        ├── Job 1: Build & Push
        │     └── docker build → mariuseu/world-tracker:sha + latest
        │
        ├── Job 2: Terraform
        │     ├── terraform init
        │     ├── terraform plan
        │     └── terraform apply → VPC + EKS on AWS
        │
        ├── Job 3: Deploy
        │     ├── aws eks update-kubeconfig
        │     ├── kubectl apply namespace
        │     ├── kubectl apply configmap
        │     ├── kubectl apply deployment
        │     ├── kubectl apply service
        │     └── kubectl rollout status
        │
        └── Job 4: Ansible Smoke Test
              ├── Wait for app to be reachable (retries: 10, delay: 15s)
              ├── Assert /health returns {"status": "healthy"}
              ├── Assert /info returns required fields
              └── Print deployment summary with pod hostname

---

## 🌐 Application Features

- **✈️ Live Flights** — Real-time aircraft positions worldwide (OpenSky Network)
- **🌋 Earthquakes** — Last 24h seismic activity with magnitude scale (USGS)
- **🌤️ Weather** — Click anywhere on the map for local weather (Open-Meteo)

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Web dashboard |
| `/health` | GET | Kubernetes liveness/readiness probe |
| `/info` | GET | Pod hostname, version, environment |
| `/api/flights` | GET | Live flight data proxy |
| `/api/earthquakes` | GET | Earthquake data proxy |
| `/api/weather?lat=&lon=` | GET | Weather data proxy |

---

## ⚙️ Local Bootstrap (Ansible)

The `devops-project` VM was provisioned from scratch using Ansible from `ansible-ctrl`:

    # On ansible-ctrl (192.168.1.58)
    ansible-playbook ansible/playbooks/provision-project.yml

This installs on `devops-project`:
- Docker Engine
- Git (configured for marius-org)
- Terraform
- kubectl
- AWS CLI v2

Dynamic inventory is powered by the `community.proxmox` collection querying Proxmox at `192.168.1.12`.

---

## 🏛️ Infrastructure Details

### VPC
- CIDR: `10.0.0.0/16`
- 3 public subnets (Load Balancers)
- 3 private subnets (Worker Nodes)
- Single NAT Gateway for outbound traffic

### EKS Cluster
- Kubernetes version: 1.32
- Node type: `t3.small`
- Node count: 2 (min: 1, max: 3)
- Add-ons: CoreDNS, kube-proxy, vpc-cni

### Kubernetes Resources
- Namespace: `world-tracker`
- Deployment: 2 replicas with liveness + readiness probes
- Service: Network Load Balancer (internet-facing, port 80)

### Terraform State
- Backend: S3 (`2048-devops-terraform-state`)
- Key: `world-tracker/terraform.tfstate`
- Region: `eu-west-1`

---

## 🔐 Secrets Management

All sensitive values are stored as **GitHub Organization secrets** under `marius-org`:

| Secret | Purpose |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub authentication |
| `DOCKERHUB_TOKEN` | Docker Hub authentication |
| `AWS_ACCESS_KEY_ID` | AWS provisioning |
| `AWS_SECRET_ACCESS_KEY` | AWS provisioning |

---

## 💣 Destroy Infrastructure

To avoid AWS costs when not in use:

    # Delete Kubernetes LoadBalancer first
    kubectl delete svc world-tracker -n world-tracker

    # Then destroy all AWS resources
    cd terraform
    terraform destroy -auto-approve

Re-deploy anytime with a simple `git push`.