# 🚀 Deployment & Scaling Strategy

## 🎯 Overview

This document outlines the comprehensive deployment and scaling strategy for Llama Wool Farm's backend services, covering containerization, orchestration, auto-scaling, and production deployment patterns.

## 🐳 Containerization Strategy

### Docker Architecture

```dockerfile
# Multi-stage build for Game Service
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Install security updates
RUN apk upgrade --no-cache

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/server.js"]
```

### Service-Specific Dockerfiles

```dockerfile
# User Service Dockerfile
FROM node:18-alpine AS user-service

WORKDIR /app
COPY services/user-service/package*.json ./
RUN npm ci --only=production

COPY services/user-service/ .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/server.js"]

# Game Service Dockerfile
FROM node:18-alpine AS game-service

WORKDIR /app
COPY services/game-service/package*.json ./
RUN npm ci --only=production

COPY services/game-service/ .
RUN npm run build

EXPOSE 3002
CMD ["node", "dist/server.js"]

# Save Service Dockerfile
FROM node:18-alpine AS save-service

WORKDIR /app
COPY services/save-service/package*.json ./
RUN npm ci --only=production

COPY services/save-service/ .
RUN npm run build

EXPOSE 3003
CMD ["node", "dist/server.js"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  gateway:
    build: 
      context: ./services/gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/llamawool
      - REDIS_URI=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - llamawool-network

  # User Service
  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/llamawool
      - REDIS_URI=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - llamawool-network

  # Game Service
  game-service:
    build:
      context: ./services/game-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/llamawool
      - REDIS_URI=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - llamawool-network

  # Save Service
  save-service:
    build:
      context: ./services/save-service
      dockerfile: Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/llamawool
      - REDIS_URI=redis://redis:6379
      - S3_BUCKET=llamawool-saves-dev
    depends_on:
      - mongodb
      - redis
    networks:
      - llamawool-network

  # MongoDB
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=llamawool
    volumes:
      - mongodb-data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js
    networks:
      - llamawool-network

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - llamawool-network

  # WebSocket Gateway
  websocket-gateway:
    build:
      context: ./services/websocket-gateway
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=development
      - REDIS_URI=redis://redis:6379
    depends_on:
      - redis
    networks:
      - llamawool-network

volumes:
  mongodb-data:
  redis-data:

networks:
  llamawool-network:
    driver: bridge
```

## ☸️ Kubernetes Orchestration

### Cluster Architecture

```yaml
# Namespace Definition
apiVersion: v1
kind: Namespace
metadata:
  name: llamawool-production
  labels:
    name: llamawool-production
    environment: production
```

### Service Deployments

```yaml
# Game Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-service
  namespace: llamawool-production
  labels:
    app: game-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: game-service
  template:
    metadata:
      labels:
        app: game-service
        version: v1
    spec:
      containers:
      - name: game-service
        image: llamawool/game-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: mongodb-uri
        - name: REDIS_URI
          valueFrom:
            secretKeyRef:
              name: cache-secret
              key: redis-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secret
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop:
              - ALL
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config-volume
        configMap:
          name: game-service-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - game-service
              topologyKey: kubernetes.io/hostname
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300

---
# Game Service Service
apiVersion: v1
kind: Service
metadata:
  name: game-service
  namespace: llamawool-production
  labels:
    app: game-service
spec:
  selector:
    app: game-service
  ports:
  - port: 3002
    targetPort: 3002
    protocol: TCP
  type: ClusterIP
```

### Horizontal Pod Autoscaler

```yaml
# HPA Configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: game-service-hpa
  namespace: llamawool-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: game-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: External
    external:
      metric:
        name: active_users
        selector:
          matchLabels:
            service: game-service
      target:
        type: Value
        value: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Min
```

### ConfigMaps and Secrets

```yaml
# ConfigMap for Game Service
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-service-config
  namespace: llamawool-production
data:
  game-config.json: |
    {
      "production": {
        "baseProductionRate": 0.1,
        "offlineEfficiency": 0.5,
        "maxOfflineHours": 24,
        "autoSaveInterval": 30000,
        "cloudSyncInterval": 60000
      },
      "antiCheat": {
        "enabled": true,
        "maxActionsPerMinute": 60,
        "suspiciousActivityThreshold": 5
      },
      "cache": {
        "gameStateTTL": 3600,
        "leaderboardTTL": 300,
        "userProfileTTL": 1800
      }
    }

---
# Secrets for Database Connections
apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: llamawool-production
type: Opaque
stringData:
  mongodb-uri: "mongodb://username:password@mongodb-cluster:27017/llamawool?authSource=admin"
  mongodb-readonly-uri: "mongodb://readonly:password@mongodb-cluster:27017/llamawool?readPreference=secondary"

---
# Secrets for Cache Connections
apiVersion: v1
kind: Secret
metadata:
  name: cache-secret
  namespace: llamawool-production
type: Opaque
stringData:
  redis-uri: "redis://redis-cluster:6379"
  redis-password: "secure-redis-password"

---
# Secrets for Authentication
apiVersion: v1
kind: Secret
metadata:
  name: auth-secret
  namespace: llamawool-production
type: Opaque
stringData:
  jwt-secret: "super-secure-jwt-secret-key"
  oauth-client-id: "oauth-client-id"
  oauth-client-secret: "oauth-client-secret"
```

## 🎯 Auto-Scaling Configuration

### Cluster Autoscaling

```yaml
# Cluster Autoscaler Configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  nodes.max: "100"
  nodes.min: "3"
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"
  skip-nodes-with-local-storage: "false"
  skip-nodes-with-system-pods: "false"
```

### Vertical Pod Autoscaler

```yaml
# VPA Configuration
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: game-service-vpa
  namespace: llamawool-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: game-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: game-service
      minAllowed:
        cpu: 50m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
```

### Custom Metrics Autoscaling

```typescript
// Custom Metrics Adapter
class CustomMetricsAdapter {
  async getActiveUsers(): Promise<number> {
    const activeConnections = await this.websocketGateway.getActiveConnections();
    const recentActivity = await this.analytics.getRecentActivity(5); // last 5 minutes
    
    return Math.max(activeConnections, recentActivity);
  }
  
  async getRequestsPerSecond(): Promise<number> {
    const metrics = await this.prometheus.query(
      'sum(rate(http_requests_total[1m]))'
    );
    return metrics.data.result[0].value[1];
  }
  
  async getQueueDepth(): Promise<number> {
    const queueLength = await this.redis.llen('task-queue');
    return queueLength;
  }
}
```

## 🌍 Multi-Region Deployment

### Global Architecture

```yaml
# Global Load Balancer Configuration
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: llamawool-ssl-cert
spec:
  domains:
    - api.llamawool.com
    - api-us.llamawool.com
    - api-eu.llamawool.com
    - api-asia.llamawool.com

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: llamawool-global-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "llamawool-global-ip"
    networking.gke.io/managed-certificates: "llamawool-ssl-cert"
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: api.llamawool.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
  - host: api-us.llamawool.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-us
            port:
              number: 80
  - host: api-eu.llamawool.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-eu
            port:
              number: 80
```

### Regional Deployment Strategy

```typescript
// Regional Deployment Configuration
interface RegionalConfig {
  region: string;
  clusters: {
    primary: KubernetesCluster;
    backup: KubernetesCluster;
  };
  databases: {
    primary: MongoDBCluster;
    replica: MongoDBCluster;
  };
  cache: {
    primary: RedisCluster;
    replica: RedisCluster;
  };
  cdn: CDNConfig;
  monitoring: MonitoringConfig;
}

const regions: RegionalConfig[] = [
  {
    region: 'us-central1',
    clusters: {
      primary: 'llamawool-us-primary',
      backup: 'llamawool-us-backup'
    },
    databases: {
      primary: 'mongodb-us-primary',
      replica: 'mongodb-us-replica'
    },
    cache: {
      primary: 'redis-us-primary',
      replica: 'redis-us-replica'
    },
    cdn: {
      provider: 'cloudflare',
      region: 'us'
    },
    monitoring: {
      prometheus: 'prometheus-us',
      grafana: 'grafana-us'
    }
  },
  {
    region: 'europe-west1',
    clusters: {
      primary: 'llamawool-eu-primary',
      backup: 'llamawool-eu-backup'
    },
    databases: {
      primary: 'mongodb-eu-primary',
      replica: 'mongodb-eu-replica'
    },
    cache: {
      primary: 'redis-eu-primary',
      replica: 'redis-eu-replica'
    },
    cdn: {
      provider: 'cloudflare',
      region: 'eu'
    },
    monitoring: {
      prometheus: 'prometheus-eu',
      grafana: 'grafana-eu'
    }
  }
];
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths: ['backend/**']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [game-service, user-service, save-service, gateway]
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/services/${{ matrix.service }}/package-lock.json
    
    - name: Install dependencies
      run: npm ci
      working-directory: backend/services/${{ matrix.service }}
    
    - name: Run linting
      run: npm run lint
      working-directory: backend/services/${{ matrix.service }}
    
    - name: Run unit tests
      run: npm run test:unit
      working-directory: backend/services/${{ matrix.service }}
    
    - name: Run integration tests
      run: npm run test:integration
      working-directory: backend/services/${{ matrix.service }}
      env:
        MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
        REDIS_URI: ${{ secrets.TEST_REDIS_URI }}

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: 'backend/'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    strategy:
      matrix:
        service: [game-service, user-service, save-service, gateway]
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: backend/services/${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'
    
    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: Deploy to staging
      run: |
        kubectl set image deployment/game-service game-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/game-service:${{ github.sha }}
        kubectl set image deployment/user-service user-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/user-service:${{ github.sha }}
        kubectl set image deployment/save-service save-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/save-service:${{ github.sha }}
        kubectl set image deployment/gateway gateway=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/gateway:${{ github.sha }}
        
        kubectl rollout status deployment/game-service --timeout=300s
        kubectl rollout status deployment/user-service --timeout=300s
        kubectl rollout status deployment/save-service --timeout=300s
        kubectl rollout status deployment/gateway --timeout=300s

  smoke-test:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
    - uses: actions/checkout@v3
    
    - name: Run smoke tests
      run: |
        npm ci
        npm run test:smoke
      working-directory: backend/tests
      env:
        STAGING_URL: ${{ secrets.STAGING_URL }}
        TEST_USER_TOKEN: ${{ secrets.TEST_USER_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: smoke-test
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'
    
    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: Deploy to production
      run: |
        kubectl set image deployment/game-service game-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/game-service:${{ github.sha }}
        kubectl set image deployment/user-service user-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/user-service:${{ github.sha }}
        kubectl set image deployment/save-service save-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/save-service:${{ github.sha }}
        kubectl set image deployment/gateway gateway=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/gateway:${{ github.sha }}
        
        kubectl rollout status deployment/game-service --timeout=600s
        kubectl rollout status deployment/user-service --timeout=600s
        kubectl rollout status deployment/save-service --timeout=600s
        kubectl rollout status deployment/gateway --timeout=600s
    
    - name: Verify deployment
      run: |
        kubectl get deployments
        kubectl get pods
        kubectl get services
        
        # Run production health checks
        curl -f https://api.llamawool.com/health
        curl -f https://api.llamawool.com/ready
```

### Blue-Green Deployment Strategy

```typescript
// Blue-Green Deployment Controller
class BlueGreenDeployment {
  private kubernetesClient: KubernetesClient;
  private healthChecker: HealthChecker;
  
  async deploy(service: string, newVersion: string): Promise<DeploymentResult> {
    const currentColor = await this.getCurrentColor(service);
    const newColor = currentColor === 'blue' ? 'green' : 'blue';
    
    try {
      // Deploy to inactive color
      await this.deployToColor(service, newVersion, newColor);
      
      // Wait for deployment to be ready
      await this.waitForDeploymentReady(service, newColor);
      
      // Run health checks
      const healthCheck = await this.healthChecker.checkServiceHealth(
        `${service}-${newColor}`
      );
      
      if (healthCheck.status !== 'healthy') {
        throw new Error(`Health check failed: ${healthCheck.message}`);
      }
      
      // Switch traffic to new version
      await this.switchTraffic(service, newColor);
      
      // Verify traffic switch
      await this.verifyTrafficSwitch(service, newColor);
      
      // Clean up old version (after delay)
      setTimeout(() => {
        this.cleanupOldVersion(service, currentColor);
      }, 300000); // 5 minutes
      
      return {
        status: 'success',
        service,
        version: newVersion,
        color: newColor
      };
    } catch (error) {
      // Rollback on failure
      await this.rollback(service, currentColor);
      throw error;
    }
  }
  
  private async deployToColor(
    service: string,
    version: string,
    color: string
  ): Promise<void> {
    const deployment = {
      metadata: {
        name: `${service}-${color}`,
        labels: {
          app: service,
          version: version,
          color: color
        }
      },
      spec: {
        replicas: 3,
        selector: {
          matchLabels: {
            app: service,
            color: color
          }
        },
        template: {
          metadata: {
            labels: {
              app: service,
              version: version,
              color: color
            }
          },
          spec: {
            containers: [{
              name: service,
              image: `llamawool/${service}:${version}`,
              ports: [{ containerPort: 3000 }]
            }]
          }
        }
      }
    };
    
    await this.kubernetesClient.createOrUpdateDeployment(deployment);
  }
  
  private async switchTraffic(service: string, newColor: string): Promise<void> {
    const serviceDefinition = {
      metadata: {
        name: service
      },
      spec: {
        selector: {
          app: service,
          color: newColor
        },
        ports: [{
          port: 80,
          targetPort: 3000
        }]
      }
    };
    
    await this.kubernetesClient.updateService(serviceDefinition);
  }
}
```

## 🔧 Environment Management

### Environment Configuration

```typescript
// Environment Configuration Manager
interface EnvironmentConfig {
  name: string;
  cluster: string;
  database: DatabaseConfig;
  cache: CacheConfig;
  monitoring: MonitoringConfig;
  scaling: ScalingConfig;
  security: SecurityConfig;
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    cluster: 'llamawool-dev',
    database: {
      uri: 'mongodb://localhost:27017/llamawool-dev',
      replicas: 1,
      sharding: false
    },
    cache: {
      uri: 'redis://localhost:6379',
      cluster: false
    },
    monitoring: {
      enabled: true,
      retention: '7d'
    },
    scaling: {
      minReplicas: 1,
      maxReplicas: 3,
      targetCPU: 80
    },
    security: {
      tls: false,
      rbac: false
    }
  },
  staging: {
    name: 'staging',
    cluster: 'llamawool-staging',
    database: {
      uri: 'mongodb://mongodb-staging:27017/llamawool-staging',
      replicas: 3,
      sharding: false
    },
    cache: {
      uri: 'redis://redis-staging:6379',
      cluster: true
    },
    monitoring: {
      enabled: true,
      retention: '30d'
    },
    scaling: {
      minReplicas: 2,
      maxReplicas: 10,
      targetCPU: 70
    },
    security: {
      tls: true,
      rbac: true
    }
  },
  production: {
    name: 'production',
    cluster: 'llamawool-production',
    database: {
      uri: 'mongodb://mongodb-production:27017/llamawool',
      replicas: 5,
      sharding: true
    },
    cache: {
      uri: 'redis://redis-production:6379',
      cluster: true
    },
    monitoring: {
      enabled: true,
      retention: '90d'
    },
    scaling: {
      minReplicas: 3,
      maxReplicas: 50,
      targetCPU: 60
    },
    security: {
      tls: true,
      rbac: true
    }
  }
};
```

### Configuration Management

```yaml
# Helm Chart Values for Different Environments
# values-development.yaml
environment: development
replicaCount: 1
image:
  pullPolicy: Always
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

# values-staging.yaml
environment: staging
replicaCount: 2
image:
  pullPolicy: Always
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 200m
    memory: 256Mi

# values-production.yaml
environment: production
replicaCount: 3
image:
  pullPolicy: IfNotPresent
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# Prometheus Configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - /etc/prometheus/rules/*.yml
    
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
    
    - job_name: 'game-service'
      static_configs:
      - targets: ['game-service:3002']
      scrape_interval: 10s
      metrics_path: /metrics
    
    - job_name: 'user-service'
      static_configs:
      - targets: ['user-service:3001']
      scrape_interval: 10s
      metrics_path: /metrics
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Llama Wool Farm - Service Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}} - 95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "sum(active_websocket_connections)",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

## 🔄 Disaster Recovery

### Backup Strategy

```typescript
// Disaster Recovery Manager
class DisasterRecoveryManager {
  private backupService: BackupService;
  private kubernetesClient: KubernetesClient;
  
  async createDisasterRecoveryPlan(): Promise<DRPlan> {
    return {
      rpo: 15, // Recovery Point Objective: 15 minutes
      rto: 60, // Recovery Time Objective: 1 hour
      
      backupStrategy: {
        database: {
          frequency: 'every 15 minutes',
          retention: '30 days',
          type: 'incremental'
        },
        application: {
          frequency: 'every deployment',
          retention: '90 days',
          type: 'full'
        },
        configuration: {
          frequency: 'every change',
          retention: '1 year',
          type: 'versioned'
        }
      },
      
      recoveryProcedures: {
        database: this.recoverDatabase,
        application: this.recoverApplication,
        configuration: this.recoverConfiguration
      }
    };
  }
  
  async executeDisasterRecovery(
    scenario: DisasterScenario
  ): Promise<RecoveryResult> {
    const plan = await this.createDisasterRecoveryPlan();
    
    switch (scenario.type) {
      case 'database_failure':
        return await this.recoverFromDatabaseFailure(scenario);
      case 'cluster_failure':
        return await this.recoverFromClusterFailure(scenario);
      case 'region_failure':
        return await this.recoverFromRegionFailure(scenario);
      default:
        throw new Error(`Unknown disaster scenario: ${scenario.type}`);
    }
  }
  
  private async recoverFromRegionFailure(
    scenario: DisasterScenario
  ): Promise<RecoveryResult> {
    // 1. Failover to secondary region
    await this.failoverToSecondaryRegion(scenario.affectedRegion);
    
    // 2. Update DNS to point to secondary region
    await this.updateDNSFailover(scenario.affectedRegion);
    
    // 3. Restore data from backups
    await this.restoreDataFromBackups(scenario.backupTimestamp);
    
    // 4. Verify system integrity
    const healthCheck = await this.verifySystemHealth();
    
    return {
      status: 'success',
      recoveryTime: Date.now() - scenario.timestamp,
      dataLoss: this.calculateDataLoss(scenario.backupTimestamp),
      healthCheck
    };
  }
}
```

This comprehensive deployment and scaling strategy provides a robust foundation for deploying and managing Llama Wool Farm's backend services at scale. The architecture supports everything from local development to global production deployment with automatic scaling, monitoring, and disaster recovery capabilities.

---

## 🎯 Next Steps

1. **Implement containerization** for all services
2. **Set up Kubernetes cluster** with proper networking
3. **Configure monitoring stack** (Prometheus, Grafana, AlertManager)
4. **Establish CI/CD pipeline** with automated testing
5. **Implement auto-scaling** based on custom metrics
6. **Set up multi-region deployment** for global availability
7. **Test disaster recovery procedures** regularly