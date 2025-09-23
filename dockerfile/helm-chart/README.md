# Packmind Helm Chart

This Helm chart deploys Packmind, an AI-powered coding assistance platform, on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.8.0+
- NGINX Ingress Controller (if using ingress)

## Installation

### Quick Start

```bash
# Add required dependencies
helm dependency update

# Install with default values
helm install packmind ./helm-chart

# Install with custom values
helm install packmind ./helm-chart -f custom-values.yaml
```

### Using External Databases

If you want to use external PostgreSQL and Redis:

```bash
helm install packmind ./helm-chart \
  --set postgresql.enabled=false \
  --set postgresql.external.host=your-postgres-host \
  --set postgresql.external.database=packmind \
  --set postgresql.external.username=postgres \
  --set redis.enabled=false \
  --set redis.external.host=your-redis-host
```

### Production Deployment

For production deployments, it's recommended to:

1. Use external managed databases
2. Configure proper health checks
3. Set up proper ingress with TLS
4. Use secrets for sensitive data
5. Configure autoscaling if needed

```yaml
# production-values.yaml
global:
  labels:
    environment: production
    team: platform

# Use external databases
postgresql:
  enabled: false
  external:
    host: 'your-postgres-cluster.region.rds.amazonaws.com'
    database: 'packmind'
    username: 'packmind_user'
    existingSecret: 'packmind-db-secret'

redis:
  enabled: false
  external:
    host: 'your-redis-cluster.region.cache.amazonaws.com'

# Configure ingress with TLS
ingress:
  enabled: true
  className: 'nginx'
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
  hosts:
    - host: packmind.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          backend:
            service: frontend
        - path: /api
          pathType: Prefix
          backend:
            service: api
        - path: /mcp
          pathType: Prefix
          backend:
            service: mcp-server
  tls:
    - secretName: packmind-tls
      hosts:
        - packmind.yourdomain.com

# Enable autoscaling
api:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

frontend:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

mcpServer:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70
```

## Configuration

### Key Configuration Options

| Parameter            | Description                           | Default |
| -------------------- | ------------------------------------- | ------- |
| `global.labels`      | Labels to apply to all resources      | `{}`    |
| `global.annotations` | Annotations to apply to all resources | `{}`    |
| `api.enabled`        | Enable API service                    | `true`  |
| `frontend.enabled`   | Enable Frontend service               | `true`  |
| `mcpServer.enabled`  | Enable MCP Server service             | `true`  |
| `postgresql.enabled` | Enable internal PostgreSQL            | `true`  |
| `redis.enabled`      | Enable internal Redis                 | `true`  |
| `ingress.enabled`    | Enable ingress                        | `true`  |

### Images

Each service can use custom images:

```yaml
api:
  image:
    repository: your-registry/packmind-api
    tag: 'v1.2.3'
    pullPolicy: IfNotPresent

frontend:
  image:
    repository: your-registry/packmind-frontend
    tag: 'v1.2.3'

mcpServer:
  image:
    repository: your-registry/packmind-mcp
    tag: 'v1.2.3'
```

### Private Docker Registry

To use a private Docker registry, configure the registry credentials:

#### Option 1: Let Helm Create the Registry Secret

```yaml
# Configure private registry
dockerRegistry:
  enabled: true
  registry: "your-registry.example.com"
  username: "your-username"
  password: "your-password"
  email: "your-email@example.com"

# Update image repositories
api:
  image:
    repository: "your-registry.example.com/packmind/api"

frontend:
  image:
    repository: "your-registry.example.com/packmind/frontend"

mcpServer:
  image:
    repository: "your-registry.example.com/packmind/mcp"
```

#### Option 2: Use Existing Registry Secret

```bash
# Create registry secret manually
kubectl create secret docker-registry my-registry-secret \
  --docker-server=your-registry.example.com \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email@example.com
```

```yaml
# Use existing secret
dockerRegistry:
  enabled: false
  existingSecret: "my-registry-secret"

# Or alternatively
imagePullSecrets:
  - name: "my-registry-secret"
```

#### Option 3: Use External Secret Management

When using external secret operators (Vault, External Secrets Operator, etc.):

```yaml
# Disable Helm secret creation
secrets:
  create: false

dockerRegistry:
  enabled: false
  existingSecret: "registry-secret-from-vault"

# Let your external operator create the secret
# then reference it in imagePullSecrets
imagePullSecrets:
  - name: "registry-secret-from-vault"
```

See `examples/private-registry.yaml` for a complete example.

### Secrets Management

#### Using Helm Values (Not Recommended for Production)

```yaml
secrets:
  api:
    jwtSecretKey: 'your-secret-key'
    encryptionKey: 'your-encryption-key'
    openaiApiKey: 'your-openai-key'
  mcp:
    jwtSecretKey: 'your-mcp-secret'
```

#### Using Existing Secrets (Recommended)

```bash
# Create secrets manually
kubectl create secret generic packmind-api-secrets \
  --from-literal=api-jwt-secret-key="your-secret" \
  --from-literal=encryption-key="your-key" \
  --from-literal=openai-api-key="your-openai-key"

kubectl create secret generic packmind-mcp-secrets \
  --from-literal=mcp-jwt-secret-key="your-mcp-secret"
```

```yaml
# Reference existing secrets
secrets:
  existing:
    apiSecret: 'packmind-api-secrets'
    mcpSecret: 'packmind-mcp-secrets'
```

## Networking

### Ingress Routes

The default ingress configuration routes:

- `/` → Frontend (main application)
- `/api/*` → API service
- `/mcp/*` → MCP Server

### Service Mesh

The chart is compatible with service mesh solutions like Istio. You may need to:

1. Disable network policies
2. Add appropriate annotations for sidecar injection
3. Configure virtual services and destination rules

## Health Checks

All services include health checks:

- **API**: `GET /healthcheck`
- **Frontend**: `GET /` (static content)
- **MCP Server**: `GET /healthcheck`

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   kubectl logs -l app.kubernetes.io/component=api
   ```

2. **Ingress Not Working**

   ```bash
   kubectl describe ingress packmind
   kubectl get endpoints
   ```

3. **Secret Issues**
   ```bash
   kubectl get secrets
   kubectl describe secret packmind-api-secrets
   ```

### Useful Commands

```bash
# View all resources
kubectl get all -l app.kubernetes.io/instance=packmind

# Check pod logs
kubectl logs -l app.kubernetes.io/component=api -f

# Port forward to access services locally
kubectl port-forward svc/packmind-frontend 8080:80

# Debug a pod
kubectl exec -it deployment/packmind-api -- /bin/sh
```

## Upgrading

```bash
# Update dependencies
helm dependency update

# Upgrade release
helm upgrade packmind ./helm-chart -f your-values.yaml

# Rollback if needed
helm rollback packmind 1
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall packmind

# Clean up persistent volumes (if needed)
kubectl delete pvc -l app.kubernetes.io/instance=packmind
```

## Contributing

When contributing to this chart:

1. Update the version in `Chart.yaml`
2. Test with different configurations
3. Update documentation
4. Ensure all templates pass `helm lint`

## Support

For issues and questions:

- GitHub: [PackmindHub/packmind-monorepo](https://github.com/PackmindHub/packmind-monorepo)
- Documentation: [docs.packmind.com](https://docs.packmind.com)
- Email: support@packmind.com
