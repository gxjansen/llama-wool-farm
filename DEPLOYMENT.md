# 🚀 Deployment Guide

## Overview

This guide covers deployment strategies for Llama Wool Farm across different environments and platforms.

## Quick Deployment (3 Commands)

```bash
# Build production assets
npm run build

# Deploy backend
cd backend && npm run deploy:production

# Deploy frontend
npm run deploy:production
```

## Environment Setup

### Production Environment Variables

**Frontend (.env.production):**
```bash
NODE_ENV=production
REACT_APP_API_URL=https://api.llamawoolfarm.com
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-production-anon-key
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_PWA=true
REACT_APP_ENABLE_MULTIPLAYER=true
```

**Backend (.env.production):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://your-redis-instance:6379
JWT_SECRET=your-super-secure-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-key
CORS_ORIGIN=https://llamawoolfarm.com
```

## Deployment Platforms

### 1. Netlify (Frontend) + Render (Backend)

#### Frontend (Netlify)

1. **Connect Repository**:
   - Visit [Netlify](https://netlify.com)
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`

2. **Environment Variables**:
   ```bash
   # In Netlify dashboard
   REACT_APP_API_URL=https://your-api.onrender.com
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Deploy Configuration** (netlify.toml):
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
     
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
       X-XSS-Protection = "1; mode=block"
       Referrer-Policy = "strict-origin-when-cross-origin"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

#### Backend (Render)

1. **Create Web Service**:
   - Visit [Render](https://render.com)
   - Create new Web Service
   - Connect repository
   - Set build command: `cd backend && npm install`
   - Set start command: `cd backend && npm start`

2. **Environment Variables**:
   - Add all production environment variables
   - Set `NODE_ENV=production`

### 2. Vercel (Frontend) + Railway (Backend)

#### Frontend (Vercel)

1. **Deploy with Vercel CLI**:
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Configuration** (vercel.json):
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

#### Backend (Railway)

1. **Deploy with Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link
   railway up
   ```

2. **Railway Configuration**:
   - Add environment variables in Railway dashboard
   - Set custom domain if needed

### 3. AWS (Full Stack)

#### Frontend (S3 + CloudFront)

1. **Build and Upload**:
   ```bash
   npm run build
   aws s3 sync dist/ s3://your-bucket-name --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

2. **Infrastructure** (terraform/cloudformation):
   ```yaml
   # CloudFormation template
   AWSTemplateFormatVersion: '2010-09-09'
   Resources:
     S3Bucket:
       Type: AWS::S3::Bucket
       Properties:
         BucketName: llamawoolfarm-frontend
         WebsiteConfiguration:
           IndexDocument: index.html
           ErrorDocument: index.html
   ```

#### Backend (ECS/Fargate)

1. **Docker Build**:
   ```bash
   cd backend
   docker build -t llamawoolfarm-api .
   docker tag llamawoolfarm-api:latest your-ecr-repo/llamawoolfarm-api:latest
   docker push your-ecr-repo/llamawoolfarm-api:latest
   ```

2. **ECS Task Definition**:
   ```json
   {
     "family": "llamawoolfarm-api",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "api",
         "image": "your-ecr-repo/llamawoolfarm-api:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ]
       }
     ]
   }
   ```

## Docker Deployment

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=llamawoolfarm
      - POSTGRES_USER=llamauser
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

### Production Dockerfiles

**Frontend Dockerfile:**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
```

## Database Deployment

### Supabase (Recommended)

1. **Create Production Project**:
   - Visit [Supabase](https://supabase.com)
   - Create new project
   - Choose appropriate region
   - Set strong database password

2. **Run Migrations**:
   ```bash
   cd backend
   npm run supabase:deploy
   ```

3. **Setup Production Policies**:
   ```sql
   -- Enable RLS
   ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
   
   -- Policy for authenticated users
   CREATE POLICY "Users can view own game state" ON game_states
     FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can update own game state" ON game_states
     FOR UPDATE USING (auth.uid() = user_id);
   ```

### Self-Hosted PostgreSQL

1. **Setup Database**:
   ```bash
   # Create database
   createdb llamawoolfarm
   
   # Run migrations
   psql -d llamawoolfarm -f backend/supabase/migrations/schema.sql
   ```

2. **Database Configuration**:
   ```bash
   # postgresql.conf
   max_connections = 100
   shared_buffers = 256MB
   effective_cache_size = 1GB
   work_mem = 4MB
   maintenance_work_mem = 64MB
   ```

## CDN and Caching

### CloudFront Configuration

```json
{
  "DistributionConfig": {
    "CallerReference": "llamawoolfarm-cdn",
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3Origin",
          "DomainName": "llamawoolfarm-frontend.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3Origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "optimized-caching-policy",
      "Compress": true
    },
    "Comment": "Llama Wool Farm CDN",
    "Enabled": true
  }
}
```

### Cache Headers

```javascript
// Express.js cache configuration
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.match(/\.(html|json)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  }
  next();
});
```

## SSL/TLS Configuration

### Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d llamawoolfarm.com -d www.llamawoolfarm.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name llamawoolfarm.com;

    ssl_certificate /etc/letsencrypt/live/llamawoolfarm.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/llamawoolfarm.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### Application Monitoring

```javascript
// Winston logger configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Health Check Endpoints

```javascript
// Health check routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  res.json({
    status: 'ok',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

## Performance Optimization

### Frontend Optimization

```javascript
// Webpack production configuration
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: 'production',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    })
  ]
};
```

### Backend Optimization

```javascript
// PM2 ecosystem configuration
module.exports = {
  apps: [{
    name: 'llamawoolfarm-api',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Security Configuration

### Content Security Policy

```javascript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
```

## Backup and Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/llamawoolfarm"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://llamawoolfarm-backups/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### Automated Backup Schedule

```bash
# Crontab entry
0 2 * * * /usr/local/bin/backup-database.sh
```

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
   ```bash
   # Clear cache and rebuild
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection Issues**:
   ```bash
   # Check connection string
   psql $DATABASE_URL -c "SELECT version();"
   
   # Test with Node.js
   node -e "console.log(require('pg').Pool({connectionString: process.env.DATABASE_URL}))"
   ```

3. **SSL Certificate Issues**:
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/ssl/certs/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect llamawoolfarm.com:443
   ```

### Rollback Strategy

```bash
# Quick rollback script
#!/bin/bash
PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Rollback frontend
aws s3 sync s3://llamawoolfarm-releases/$PREVIOUS_VERSION/ s3://llamawoolfarm-frontend/ --delete

# Rollback backend
docker service update --image llamawoolfarm-api:$PREVIOUS_VERSION backend

# Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Rollback to version $PREVIOUS_VERSION completed"
```

## Post-Deployment Checklist

- [ ] Frontend loads successfully
- [ ] Backend API responds to health checks
- [ ] Database connections are working
- [ ] SSL certificates are valid
- [ ] CDN cache is cleared
- [ ] Monitoring alerts are configured
- [ ] Backup systems are running
- [ ] Load balancer health checks pass
- [ ] WebSocket connections work
- [ ] PWA installation works
- [ ] Game saves and loads properly
- [ ] Performance metrics are within targets