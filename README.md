<div align="center">

# 🌿 Eden

### Homelab Infrastructure

[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io) [![Talos](https://img.shields.io/badge/Talos-FF6C2C?logo=linux&logoColor=white)](https://www.talos.dev) [![ArgoCD](https://img.shields.io/badge/ArgoCD-GitOps-F05032?logo=argo&logoColor=white)](https://argoproj.github.io/cd/) [![Terraform](https://img.shields.io/badge/Terraform-IaC-844FBA?logo=terraform&logoColor=white)](https://www.terraform.io)

[![Blog](https://github.com/mortennordbye/homelab/actions/workflows/build-blog.yaml/badge.svg)](https://github.com/mortennordbye/homelab/actions/workflows/build-blog.yaml) [![Portfolio](https://github.com/mortennordbye/homelab/actions/workflows/build-portfolio.yaml/badge.svg)](https://github.com/mortennordbye/homelab/actions/workflows/build-portfolio.yaml) [![Container Security](https://github.com/mortennordbye/homelab/actions/workflows/container-vulnerability-scan.yaml/badge.svg)](https://github.com/mortennordbye/homelab/actions/workflows/container-vulnerability-scan.yaml)

[![License](https://img.shields.io/github/license/mortennordbye/homelab?style=flat-square)](LICENSE) [![Last Commit](https://img.shields.io/github/last-commit/mortennordbye/homelab?style=flat-square)](https://github.com/mortennordbye/homelab/commits/main) [![Issues](https://img.shields.io/github/issues/mortennordbye/homelab?style=flat-square)](https://github.com/mortennordbye/homelab/issues) [![Stars](https://img.shields.io/github/stars/mortennordbye/homelab?style=flat-square)](https://github.com/mortennordbye/homelab/stargazers)

My personal lab environment for experimenting with infrastructure and hosting self-hosted services. Professionally, I work with these technologies daily, but the homelab gives me freedom to explore ideas and patterns that don't always fit production constraints. This is where curiosity meets practicality, testing new tools, solving real problems at home, and yes, occasionally breaking things in the pursuit of learning.

The repository is public by design. Transparency keeps me honest about following best practices, even when it's just for fun.

</div>

## 🔗 Quick Links

- 🌐 **Portfolio:** [nordbye.it](https://nordbye.it)
- 📝 **Blog:** [blog.nordbye.it](https://blog.nordbye.it)
- 💼 **LinkedIn:** [morten-victor-nordbye](https://www.linkedin.com/in/morten-victor-nordbye/)
- 🐙 **GitHub:** [@mortennordbye](https://github.com/mortennordbye)

Feel free to send me a DM, open a pull request, or steal code from here. The goal is to learn and make connections.

---

## Network Overview

```mermaid
graph TD
    %% Monochrome Professional Styling
    classDef default fill:#2c3e50,stroke:#34495e,stroke-width:2px,color:#fff;
    classDef internet fill:#34495e,stroke:#2c3e50,stroke-width:3px,color:#fff;
    classDef subgraphStyle fill:#ecf0f1,stroke:#95a5a6,stroke-width:2px,color:#2c3e50;

    %% Network Core
    WEB(("☁️<br/>Internet")):::internet
    MDM["📶 Telia Modem<br/><i>Coax</i>"]
    UCG["🌐 UniFi Gateway<br/><i>Router</i>"]
    SW["🔗 UniFi Switch<br/><i>8-Port PoE</i>"]

    WEB --> MDM
    MDM --> UCG
    UCG --> SW

    %% Storage
    subgraph NAS["💿 Synology DS1522+"]
        direction TB
        PBS["💾 Proxmox Backup Server"]
    end
    SW --> NAS

    %% Home Automation
    subgraph HA_Box["🏡 Home Assistant"]
        direction TB
        AGH["🚫 AdGuard Home"]
    end
    SW --> HA_Box

    %% Proxmox Cluster
    subgraph HyperCluster["🖥️ Hyper-cluster - Proxmox VE"]
        direction TB

        subgraph H1["⚙️ Hyper1 - Proxmox Node"]
            direction TB
            C1["🎛️ genesis-ctrl-01"]
            C2["🎛️ genesis-ctrl-02"]
            W1["⚡ genesis-worker-01"]
        end

        subgraph H2["⚙️ Hyper2 - Proxmox Node"]
            direction TB
            C3["🎛️ genesis-ctrl-03"]
            W2["⚡ genesis-worker-02"]
            W3["⚡ genesis-worker-03"]
        end

        K8S["☸️ Genesis - Talos Kubernetes Cluster"]
        C1 -.-> K8S
        C2 -.-> K8S
        C3 -.-> K8S
        W1 -.-> K8S
        W2 -.-> K8S
        W3 -.-> K8S
    end
    SW --> HyperCluster

    %% Access Point
    AP["📡 UniFi U6+<br/><i>WiFi 6 AP</i>"]
    SW --> AP

    %% IoT & Smart Home Devices
    HUE["💡 Hue Bridge Pro"]
    ZBT["📶 Nabu Casa ZBT-2<br/><i>Zigbee</i>"]
    BLE["🔵 M5Stack Atom Lite<br/><i>Bluetooth</i>"]
    CAM["📹 UniFi G6 Instant"]

    SW --> HUE <--> HA_Box
    AP --> BLE <--> HA_Box
    AP --> CAM <--> HA_Box
    HA_Box --> ZBT
```

---

## Kubernetes Application Stack

```mermaid
graph TB
    %% Monochrome Professional Styling
    classDef default fill:#2c3e50,stroke:#34495e,stroke-width:2px,color:#fff;

    %% GitOps Layer
    REPO["📦 GitHub Repository"]
    ARGO["🔄 ArgoCD"]

    REPO --> ARGO

    %% Infrastructure Layer
    subgraph INFRA["🔧 Infrastructure"]
        direction TB
        ARGOCD["🔄 argocd"]
        CILIUM["🕸️ cilium"]
        TRAEFIK["🚪 traefik"]
        CERT["🔒 cert-manager"]
        PROM["📊 kube-prometheus-stack"]
        METRICS["📈 metrics-server"]
        OTEL["📡 otel-collector"]
        CSI["💾 proxmox-csi-plugin"]
        NFS["📁 syno-nfs-prov"]
        ESO["🔐 external-secrets-operator"]
        CRDS["📦 crds"]
    end

    %% Application Layer
    subgraph APPS["📱 Applications"]
        direction TB
        PLEX["🎬 plex-media-stack"]
        ARR["📚 arr-stack"]
        AUDIO["🎧 audiobookshelf"]
        PORTFOLIO["💼 portfolio"]
        PORTFOLIOS["💼 portfolio-stage"]
        HOME["🏠 homepage"]
        TOOLS["🔧 it-tools"]
        OMNI["🔧 omni-tools"]
        VPN["🔒 gluetun-vpn"]
    end

    ARGO --> INFRA
    ARGO --> APPS
```

---

## 📂 Repository Structure

> **Note:** This is a simplified view showing the main folders and key files. The actual repository contains additional directories and configurations.

```
📦 homelab
├── 📁 k8s/talos/
│   ├── 📁 apps/                         # Application deployments
│   │   ├── 📁 arr-stack/
│   │   ├── 📁 blog/
│   │   └── 📁 plex-media-stack/
│   └── 📁 infra/                        # Infrastructure components
│       ├── 📁 argocd/
│       ├── 📁 cilium/
│       └── 📁 traefik/
├── 📁 terraform/
│   ├── 📁 azure/
│   │   └── 📁 state/                    # Remote state backend
│   └── 📁 proxmox/                      # Proxmox cluster IaC
│       └── 📁 hyper-cluster/
│           └── 📁 k8s/
├── 📁 blog/                             # Hugo blog source
│   ├── Dockerfile
│   ├── 📁 config/
│   ├── 📁 content/
│   └── 📁 themes/
├── 📁 portfolio/                        # Portfolio site source
│   ├── Dockerfile
│   ├── 📁 nginx/
│   └── 📁 src/
└── 📁 ai/                               # AI agents, skills, projects, local LLM
    ├── 📁 agents/
    ├── 📁 skills/
    ├── 📁 projects/
    ├── 📁 local-llm/
    ├── 📁 prompts/
    └── 📁 notes/
```

---

## ☸️ Kubernetes Tech Stack

| Category      | Components                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitOps        | [ArgoCD](https://argoproj.github.io/cd/)                                                                                                                                               |
| Networking    | [Cilium](https://cilium.io/) (CNI + eBPF), [Traefik](https://traefik.io/) ([Gateway API](https://gateway-api.sigs.k8s.io/))                                                            |
| Security      | [Cert-manager](https://cert-manager.io/), [External Secrets Operator](https://external-secrets.io/)                                                                                    |
| Observability | [Prometheus](https://prometheus.io/), [Grafana](https://grafana.com/), [OpenTelemetry](https://opentelemetry.io/), [Metrics-server](https://github.com/kubernetes-sigs/metrics-server) |
| Storage       | [Proxmox CSI](https://github.com/sergelogvinov/proxmox-csi-plugin), [Synology](https://www.synology.com/) (NFS)                                                                        |
| Platform      | [Proxmox VE](https://www.proxmox.com/) (6-node HA cluster), [Talos Linux](https://www.talos.dev/), [Terraform](https://www.terraform.io/)                                              |

---

## 🔒 Security

### Container Vulnerability Scanning

Automated vulnerability scanning runs weekly and on every Dockerfile change using Trivy. Scans detect CRITICAL and HIGH severity vulnerabilities in both blog and portfolio containers, with results automatically uploaded to GitHub Security tab for tracking and remediation.

---

## 🔄 CI/CD Workflows

| Workflow                                                                                | Trigger                                   | Purpose                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| [**Build and Deploy Blog**](.github/workflows/build-blog.yaml)                          | Push to `main` (blog changes)             | Builds Hugo blog, pushes to GHCR, updates k8s manifest |
| [**Build and Deploy Portfolio**](.github/workflows/portfolio.yaml)                      | Push to `main`/`prod` (portfolio changes) | Multi-environment deployment (stage/prod) to k8s       |
| [**Container Vulnerability Scan**](.github/workflows/container-vulnerability-scan.yaml) | Weekly, Dockerfile changes, manual        | Scans blog & portfolio containers with Trivy           |
| [**K8s Update Reminder**](.github/workflows/30-days-k8s-update-reminder.yml)            | Monthly (1st)                             | Discord notification for Kubernetes maintenance        |
| [**Server Update Reminder**](.github/workflows/30-days-server-update-reminder.yml)      | Monthly (15th)                            | Discord notification for server updates                |
| [**Actions Runner Test**](.github/workflows/test-arc.yml)                               | Manual                                    | Tests self-hosted ARC runner functionality             |

---

## Hardware

### Compute Nodes

| Node   | Model                        | CPU                                     | RAM   | Storage |
| ------ | ---------------------------- | --------------------------------------- | ----- | ------- |
| Hyper1 | Lenovo ThinkCentre M920 Tiny | Intel Core i7-8700T (6C/12T @ 2.40 GHz) | 32 GB | 1 TB    |
| Hyper2 | Lenovo ThinkCentre M920q     | Intel Core i5-8500T (6C/6T @ 2.10 GHz)  | 32 GB | 1 TB    |

### Storage

| Device | Model            | Capacity        | Details                        |
| ------ | ---------------- | --------------- | ------------------------------ |
| NAS    | Synology DS1522+ | 3 × 20TB (60TB) | SHR, Btrfs, 2 × 1TB NVMe cache |

### Network Equipment

| Device       | Model               | Type           |
| ------------ | ------------------- | -------------- |
| Router       | UniFi Cloud Gateway | Gateway/Router |
| Switch       | UniFi Lite 8 PoE    | Managed Switch |
| Access Point | UniFi U6+           | WiFi 6 AP      |
| Modem        | Telia               | Cable Modem    |

### IoT & Smart Home

#### Home Assistant Server

| Component | Model                       | CPU        | RAM | Network         |
| --------- | --------------------------- | ---------- | --- | --------------- |
| Hardware  | Topton N100 Fanless Mini PC | Intel N100 | TBD | 4 × 2.5G i226-V |

#### Devices

| Device                  | Type               | Purpose                    |
| ----------------------- | ------------------ | -------------------------- |
| Philips Hue Bridge Pro  | Smart Lighting Hub | Lighting control           |
| Nabu Casa Connect ZBT-2 | Zigbee Coordinator | Zigbee device coordination |
| M5Stack Atom Lite       | Bluetooth Proxy    | Bluetooth range extension  |
| UniFi G6 Instant        | Security Camera    | Indoor surveillance        |

---

<div align="center">

### ⭐ Star this repo if you find it useful!

Made with ☕ and ☸️ by [Morten Victor Nordbye](https://nordbye.it)

</div>
