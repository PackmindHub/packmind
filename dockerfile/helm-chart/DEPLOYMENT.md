# Packmind Helm Chart - Quick Deployment Guide

## Overview

This Helm chart deploys Packmind with the following services:

- **API Service** (port 3000) - Backend API with `/healthcheck` endpoint
- **Frontend Service** (port 80) - React application
- **MCP Server** (port 3001) - MCP service with `/healthcheck` endpoint
- **PostgreSQL** (optional) - Database (can use external)
- **Redis** (optional) - Cache (can use external)

## Database Configuration

### Using External Database

The chart supports external PostgreSQL through a single `DATABASE_URL` environment variable:

```yaml
postgresql:
  enabled: false
  external:
    # Option 1: Direct URL in values (not recommended for production)
    databaseUrl: 'postgres://user:password@host:port/database'

    # Option 2: Reference existing secret (recommended)
    existingSecret: 'my-db-secret'
    existingSecretKey: 'database-url'
```

### Creating Database Secret

```bash
kubectl create secret generic my-db-secret \
  --from-literal=database-url="postgres://user:password@host:port/database"
```

## Quick Start Commands

### Development Deployment

```bash
helm install packmind . -f examples/development-values.yaml
```

### Production with External Databases

```bash
# Create secrets first
kubectl create secret generic packmind-api-secrets \
  --from-literal=api-jwt-secret-key="your-secret" \
  --from-literal=encryption-key="your-key"

kubectl create secret generic packmind-mcp-secrets \
  --from-literal=mcp-jwt-secret-key="your-secret"

# Deploy with external databases
helm install packmind . -f examples/production-values.yaml \
  --set postgresql.external.databaseUrl="postgres://user:pass@host:5432/db"
```

### Using External Services Only

```bash
helm install packmind . -f examples/external-databases-values.yaml
```

## Health Checks

All services include basic HTTP health checks:

- **API**: `GET /healthcheck` on port 3000
- **MCP Server**: `GET /healthcheck` on port 3001
- **Frontend**: `GET /` on port 80 (static content)

## Accessing the Application

With default ingress configuration:

- Frontend: `http://packmind.local/`
- API: `http://packmind.local/api`
- MCP: `http://packmind.local/mcp`

## Customization

### Global Labels and Annotations

```yaml
global:
  labels:
    environment: production
    team: platform
  annotations:
    contact: admin@company.com
```

### Custom Images

```yaml
api:
  image:
    repository: your-registry/packmind-api
    tag: 'v1.0.0'
```

### Resource Limits

```yaml
api:
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi
```

### Autoscaling

```yaml
api:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
```

## Simplicity Focus

This chart prioritizes simplicity and ease of use:

- Basic HTTP health checks only (no Prometheus)
- No pod disruption budgets
- Minimal security policies
- Easy to understand and customize

## Troubleshooting

```bash
# Check all resources
kubectl get all -l app.kubernetes.io/instance=packmind

# View API logs
kubectl logs -l app.kubernetes.io/component=api -f

# Check database connectivity
kubectl exec deployment/packmind-api -- env | grep DATABASE_URL

# Port forward for local testing
kubectl port-forward svc/packmind-frontend 8080:80
```
