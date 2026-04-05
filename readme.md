# Node.js Microservices — Full DevOps Documentation

![GitHub branch](https://img.shields.io/badge/branch-staging-blue)
![Kubernetes](https://img.shields.io/badge/kubernetes-1.29-blue)
![Docker](https://img.shields.io/badge/docker-hub-dusky88-blue)
![Vagrant](https://img.shields.io/badge/vagrant-2.4.x-purple)
![Ansible](https://img.shields.io/badge/ansible-provisioned-red)
![Prometheus](https://img.shields.io/badge/monitoring-prometheus%20%2B%20grafana-orange)

---

## Project Overview

A production-grade microservices application deployed on a local Kubernetes cluster, built with Node.js, MongoDB, and RabbitMQ. The full DevOps pipeline includes infrastructure automation, CI/CD, containerization, monitoring, alerting, and automated backups.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPER (Windows PC)                              │
│                   VS Code · Git · MobaXterm                             │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ git push staging
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        GITHUB — staging branch                          │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                  GitHub Actions CI/CD                           │  │
│   │  Job 1: Build & Test → Job 2: Build & Push → Job 3: Deploy     │  │
│   └────────────┬──────────────────────┬─────────────────┬───────────┘  │
└────────────────┼──────────────────────┼─────────────────┼──────────────┘
                 │ npm install          │ docker push     │ kubectl apply
                 ▼                      ▼                 ▼
         (ubuntu-latest)      ┌──────────────────┐  (self-hosted runner)
                              │   DOCKER HUB     │    on k8s-master
                              │  dusky88/nms_*   │
                              │  user-service    │
                              │  task-service    │
                              │  notif-service   │
                              └──────────────────┘
                                                          │
                          ┌───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VAGRANT — VirtualBox                                 │
│                    3 x Ubuntu 22.04 LTS VMs                            │
│                                                                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │   k8s-master      │  │  k8s-worker-1     │  │  k8s-worker-2     │   │
│  │ 192.168.56.10     │  │ 192.168.56.11     │  │ 192.168.56.12     │   │
│  │ Control Plane     │  │ Worker Node       │  │ Worker Node       │   │
│  │ GitHub Runner     │  │                   │  │ (all services)    │   │
│  │ Grafana :3000     │  │                   │  │ NGINX Ingress     │   │
│  │ Prometheus :9090  │  │                   │  │ NodePort :30351   │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘   │
│                                                                         │
│             Provisioned by Ansible (kubeadm + Flannel CNI)             │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             KUBERNETES CLUSTER — namespace: microservices               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  NGINX Ingress Controller                        │  │
│  │                     NodePort :30351                              │  │
│  └──────────────┬──────────────────┬──────────────────┬─────────────┘  │
│                 │ /api/users       │ /api/tasks       │ /api/notif     │
│                 ▼                  ▼                  ▼                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  user-service   │  │  task-service   │  │ notification-service │   │
│  │  3 pods :3001   │  │  3 pods :3002   │  │  3 pods :3003        │   │
│  └────────┬────────┘  └───────┬─────────┘  └──────────┬───────────┘   │
│           │                   │                         │               │
│           ▼                   ▼                         │               │
│  ┌─────────────────┐  ┌───────────────────────────────┐│               │
│  │    MongoDB      │  │          RabbitMQ             ││               │
│  │    :27017       │  │  AMQP :5672 / UI :15672       │◄┘               │
│  └─────────────────┘  └───────────────────────────────┘                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  CronJob: MongoDB Backup — schedule: "0 22 * * *" (10pm daily)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             MONITORING — namespace: monitoring                          │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   Prometheus    │  │    Grafana      │  │  Node Exporter  │        │
│  │     :9090       │  │     :3000       │  │  (all 3 nodes)  │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AlertManager — CPU > 80% / RAM > 80% → Email (Gmail SMTP)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Message Flow (RabbitMQ)

```
Client Request
     │
     ▼
NGINX Ingress (:30351)
     │
     ▼
task-service ──► saves to MongoDB
     │
     ▼
RabbitMQ (queue: task_created)
     │
     ▼
notification-service ──► logs: "Received notification for new task: <title>"
```

---

## Technology Stack

| Category | Technology |
|---|---|
| Application | Node.js, Express, Mongoose |
| Database | MongoDB 6 |
| Message Queue | RabbitMQ 3 |
| Containerization | Docker, Docker Compose |
| Container Registry | Docker Hub |
| Orchestration | Kubernetes 1.29 (kubeadm) |
| Container Runtime | containerd |
| CNI | Flannel |
| Ingress | NGINX Ingress Controller |
| VM Management | Vagrant 2.4.x + VirtualBox |
| Provisioning | Ansible |
| CI/CD | GitHub Actions (self-hosted runner) |
| Monitoring | Prometheus + Grafana + Node Exporter |
| Alerting | AlertManager (email via Gmail SMTP) |
| Backups | Kubernetes CronJob (10pm daily) |

---

## Repository Structure

```
nodejs-microservices-kubernetes/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml                    # GitHub Actions — 4 stage pipeline
│
├── ansible/                             # Infrastructure as Code
│   ├── ansible.cfg                      # Roles path + inventory config
│   ├── inventory/
│   │   └── hosts.ini                    # 3 VM IPs + SSH config
│   ├── group_vars/
│   │   └── all.yml                      # K8s version, pod CIDR, image names
│   ├── playbooks/
│   │   ├── site.yml                     # Master playbook (all phases)
│   │   ├── deploy_app.yml               # Deploy microservices to K8s
│   │   ├── setup_monitoring.yml         # Install Prometheus + Grafana (Helm)
│   │   └── setup_backups.yml            # MongoDB backup cronjob
│   ├── roles/
│   │   ├── common/tasks/main.yml        # Swap off, sysctl, kernel modules
│   │   ├── containerd/tasks/main.yml    # Install containerd runtime
│   │   ├── kubernetes_base/tasks/       # kubeadm + kubelet + kubectl
│   │   ├── kubernetes_master/tasks/     # kubeadm init + Flannel CNI
│   │   ├── kubernetes_worker/tasks/     # kubeadm join
│   │   └── cluster_addons/tasks/        # Namespaces + metrics-server
│   └── templates/
│       ├── prometheus-alert-rules.yml   # CPU/RAM alert thresholds
│       └── alertmanager-config.yml      # Gmail SMTP config
│
├── k8s/                                 # Kubernetes Manifests
│   ├── mongodb-deployment.yml
│   ├── mongodb-svc.yml
│   ├── rabbitmq-configmap.yml
│   ├── rabbitmq-service.yml
│   ├── user-service-deployment.yml      # 3 replicas + env vars
│   ├── user-service-svc.yml
│   ├── task-service-deployment.yml      # 3 replicas + env vars
│   ├── task-service-svc.yml
│   ├── notification-service-deployment.yml
│   ├── notification-service-svc.yml
│   └── ingress.yml                      # NGINX routing rules
│
├── user-service/                        # Microservice 1 — User CRUD
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── task-service/                        # Microservice 2 — Tasks + RabbitMQ
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── notification-service/                # Microservice 3 — RabbitMQ Consumer
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml                   # Local development (all services)
├── docker-compose.staging.yml           # Staging with pre-built images
├── Vagrantfile                          # 3 VM definitions
└── README.md
```

---

## Setup Guide

### Prerequisites

- Windows PC with VirtualBox installed
- Vagrant 2.4.x
- VS Code
- MobaXterm
- Git
- Docker Hub account

### Step 1 — Clone and set up project

```bash
git clone https://github.com/Dusky88/nodejs-microservices-kubernetes.git
cd nodejs-microservices-kubernetes
```

### Step 2 — Start VMs

```powershell
vagrant up
```

This creates 3 Ubuntu 22.04 VMs and runs Ansible provisioning automatically.

### Step 3 — Verify cluster

```bash
vagrant ssh k8s-master
kubectl get nodes
```

Expected output:
```
NAME           STATUS   ROLES           AGE   VERSION
k8s-master     Ready    control-plane   5m    v1.29.0
k8s-worker-1   Ready    worker          3m    v1.29.0
k8s-worker-2   Ready    worker          3m    v1.29.0
```

### Step 4 — Deploy application

```bash
ansible-playbook -i ~/ansible/inventory/hosts.ini ~/ansible/playbooks/deploy_app.yml
```

### Step 5 — Set up monitoring

```bash
ansible-playbook -i ~/ansible/inventory/hosts.ini ~/ansible/playbooks/setup_monitoring.yml
```

---

## API Endpoints

Base URL: `http://192.168.56.12:30351`

### User Service

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |

### Task Service

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create a task (triggers RabbitMQ) |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

### Example Requests

```bash
# Create a user
curl -X POST http://192.168.56.12:30351/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"John Doe","email":"john@test.com"}'

# Create a task (triggers notification via RabbitMQ)
curl -X POST http://192.168.56.12:30351/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Task","description":"Test","userId":"<user-id>"}'
```

---

## CI/CD Pipeline

The pipeline triggers automatically on every push to the `staging` branch.

### Pipeline Stages

```
1. Build & Test          (ubuntu-latest)
   └── npm install for all 3 services

2. Build & Push Images   (ubuntu-latest)
   └── docker build + push to Docker Hub
   └── tags: :staging and :<git-sha>

3. Deploy to Kubernetes  (self-hosted — k8s-master)
   └── kubectl apply all manifests
   └── Fix Pod IPs for MongoDB and RabbitMQ
   └── Wait for rollout (300s timeout)

4. Database Migration    (self-hosted — k8s-master)
   └── Create collections in MongoDB via mongosh
```

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `DOCKERHUB_TOKEN` | Docker Hub access token |

---

## Monitoring

### Access URLs

| Service | URL | Credentials |
|---|---|---|
| Grafana | `http://192.168.56.10:3000` | admin / admin@grafana123 |
| Prometheus | `http://192.168.56.10:9090` | — |
| RabbitMQ UI | `http://192.168.56.10:15672` | guest / guest |

### Dashboards

- Node Exporter Full (ID: 1860) — CPU, RAM, Disk, Network per node
- Kubernetes Cluster (ID: 6417) — Pod metrics across cluster

### Alert Rules

| Alert | Threshold | Severity |
|---|---|---|
| HighCPUUsage | CPU > 80% for 5 min | Warning |
| CriticalCPUUsage | CPU > 95% for 2 min | Critical |
| HighMemoryUsage | RAM > 80% for 5 min | Warning |
| CriticalMemoryUsage | RAM > 95% for 2 min | Critical |
| PodCrashLooping | 3+ restarts in 15 min | Warning |
| DiskSpaceLow | Disk > 85% | Warning |

All alerts send email via Gmail SMTP through AlertManager.

---

## Backup Strategy

### Automated Backups

A Kubernetes CronJob runs every day at 10pm UTC:

```yaml
schedule: "0 22 * * *"
```

The backup job:
1. Connects to the MongoDB pod
2. Runs `mongodump --gzip`
3. Stores the backup archive
4. Retains last 3 successful backups

### Manual Backup

```bash
MONGO_POD=$(kubectl get pod -n microservices -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n microservices $MONGO_POD -- mongodump --archive --gzip > backup_$(date +%Y%m%d).gz
```

### Restore

```bash
kubectl exec -i -n microservices $MONGO_POD -- mongorestore --archive --gzip < backup_20260404.gz
```

---

## Scaling

Current configuration: 3 replicas per service

```bash
kubectl scale deployment user-service --replicas=5 -n microservices
kubectl scale deployment task-service --replicas=5 -n microservices
kubectl scale deployment notification-service --replicas=5 -n microservices
```

> **Note:** All services run on k8s-worker-2 due to local Flannel CNI cross-node networking constraints. In a production cloud environment, pods distribute across all nodes automatically.

---

## Troubleshooting

### VMs not starting
```powershell
vagrant halt --force && vagrant up
```

### Pods not ready
```bash
kubectl describe pod <pod-name> -n microservices
kubectl logs <pod-name> -n microservices
```

### DNS issues between pods
```bash
kubectl rollout restart daemonset/kube-flannel-ds -n kube-flannel
kubectl rollout restart deployment/coredns -n kube-system
sudo systemctl restart kubelet   # run on all 3 VMs
```

### GitHub Actions runner offline
```bash
cd ~/actions-runner
./config.sh remove
./config.sh --url https://github.com/Dusky88/nodejs-microservices-kubernetes --token <NEW_TOKEN>
sudo ./svc.sh install && sudo ./svc.sh start
```

---

## Author

- GitHub: [Dusky88](https://github.com/Dusky88)
- Docker Hub: [dusky88](https://hub.docker.com/u/dusky88)