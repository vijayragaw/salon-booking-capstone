# Salon Booking Capstone — DevOps CI/CD Project.

A salon booking web application deployed on AWS EC2 using Docker, Jenkins CI/CD, Docker Hub, Prometheus, Grafana, and Bash automation.

## Project Overview

This project demonstrates a practical DevOps workflow by automating the build, containerization, image publishing, deployment, monitoring, and server maintenance of a Salon Booking application.

The application source code is maintained on GitHub. Jenkins automates the CI/CD pipeline, Docker packages the application, Docker Hub stores the built images, and the application is deployed on an AWS EC2 instance using Docker Compose.

## Architecture

```text
Developer
   |
   v
GitHub Repository
   |
   | Push / Webhook
   v
Jenkins CI/CD
   |
   | Checkout Source
   | Build Docker Image
   | Push Image
   v
Docker Hub
   |
   | Pull Image
   v
AWS EC2
   |
   | Docker Compose
   v
Salon Booking Application
   |
   +---- Prometheus
   |       |
   |       +---- Node Exporter
   |
   +---- Grafana Monitoring
```

## Technology Stack

| Technology | Purpose |
|---|---|
| Git & GitHub | Source code management and version control |
| AWS EC2 | Cloud hosting |
| Ubuntu | Server operating system |
| Jenkins | CI/CD automation |
| Docker | Application containerization |
| Docker Compose | Container deployment and management |
| Docker Hub | Container image registry |
| Prometheus | Metrics collection and monitoring |
| Node Exporter | Linux server metrics |
| Grafana | Monitoring dashboard and visualization |
| Bash | Automation and maintenance scripts |
| Cron | Scheduled jobs |
| Logrotate | Log management and rotation |

## Application

**Salon Booking — Juniper Studio**

The application provides a salon booking demo experience including:

- Service selection
- Appointment date and time selection
- Customer details
- Appointment preview and confirmation
- Staff appointment schedule
- Appointment cancellation
- Booking availability and conflict validation

## CI/CD Pipeline

Jenkins automates the deployment workflow.

### Pipeline stages

1. **Checkout GitHub** — retrieves the source code.
2. **Inspect Source Code** — verifies the workspace and source revision.
3. **Build Docker Image** — creates a Docker image for the application.
4. **Push to Docker Hub** — publishes the versioned image.
5. **Deploy** — updates the application on EC2 using Docker Compose.

### CI/CD Flow

```text
GitHub Push
     |
     v
GitHub Webhook
     |
     v
Jenkins Pipeline
     |
     v
Docker Image Build
     |
     v
Docker Hub Push
     |
     v
EC2 Docker Compose Pull
     |
     v
Application Deployment
```

## Docker

The application is containerized using Docker.

Docker Compose configuration includes:

- Application container
- Port mapping: `3000:3000`
- Restart policy: `unless-stopped`
- Container log size limit: 10 MB
- Maximum log files: 3

### Docker Compose

```yaml
services:
  salon-app:
    image: vijayragaw/salon-booking-app:${IMAGE_TAG:-v1}
    container_name: salon-app-compose
    ports:
      - "3000:3000"
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Docker Image Versions

Images are published to Docker Hub:

- `v1`
- `v2`
- `jenkins-build-number`

Docker image repository:

https://hub.docker.com/r/vijayragaw/salon-booking-app

## AWS Deployment

The project is deployed on an AWS EC2 instance.

The same EC2 instance hosts the capstone application and the DevOps tools to simplify the learning environment and reduce infrastructure cost.

### Services and Ports

| Service | Port |
|---|---:|
| Salon Booking Application | 3000 |
| Grafana | 3001 |
| Jenkins | 8080 |
| Prometheus | 9090 |
| Node Exporter | 9100 |

## Monitoring

### Prometheus

Prometheus collects system and application infrastructure metrics.

Monitoring targets:

- Prometheus server
- Node Exporter

Prometheus configuration uses a 15-second global scrape interval, with Prometheus itself configured to scrape every 5 seconds.

### Node Exporter

Node Exporter provides Linux server metrics including:

- CPU
- Memory
- Disk
- Filesystem
- Network
- System load

### Grafana

Grafana is configured with Prometheus as its data source.

Dashboard used:

**Node Exporter Full — Dashboard ID 1860**

Monitoring panels include CPU usage, memory usage, swap, filesystem, disk I/O, network traffic, and server uptime.

