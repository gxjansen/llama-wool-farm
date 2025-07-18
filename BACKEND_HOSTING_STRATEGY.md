# Backend Hosting Strategy for Llama Wool Farm

## Overview
While Netlify excellently hosts our static frontend, we need a separate backend solution for our MongoDB database and Node.js API endpoints. This document outlines the comprehensive backend hosting strategy.

## Recommended Architecture

### 1. **Serverless Backend (Recommended)**
**Primary Choice: Vercel + MongoDB Atlas**

#### Vercel for API Endpoints
- **Pros**: 
  - Seamless integration with Netlify frontend
  - Automatic scaling and global CDN
  - Built-in monitoring and analytics
  - Zero cold start for API functions
  - Easy deployment from GitHub
  - Excellent TypeScript/Node.js support

- **Deployment Structure**:
  ```
  /api
    ├── auth/
    │   ├── login.js
    │   ├── register.js
    │   └── refresh.js
    ├── game/
    │   ├── state.js
    │   ├── save.js
    │   └── sync.js
    ├── leaderboard/
    │   └── [category].js
    └── analytics/
        └── events.js
  ```

#### MongoDB Atlas for Database
- **Pros**:
  - Fully managed MongoDB service
  - Automatic scaling and backup
  - Built-in security and monitoring
  - Global clusters for low latency
  - Free tier available (512MB)
  - Excellent integration with Node.js

- **Configuration**:
  ```javascript
  // Connection string format
  mongodb+srv://username:password@cluster.mongodb.net/llama-wool-farm?retryWrites=true&w=majority
  ```

### 2. **Alternative: Railway + MongoDB Atlas**
**Budget-Friendly Option**

#### Railway for Backend Services
- **Pros**:
  - Simple deployment from GitHub
  - Built-in environment variables
  - Automatic HTTPS and custom domains
  - $5/month for basic plan
  - Good for small to medium applications

- **Deployment**: One-click deployment from repository

### 3. **Enterprise Option: AWS/Google Cloud**
**For Large Scale Operations**

#### AWS Setup
- **API Gateway** + **Lambda Functions** for API endpoints
- **MongoDB Atlas** or **DocumentDB** for database
- **CloudFront** for global CDN
- **Route 53** for DNS management

#### Google Cloud Setup
- **Cloud Functions** for API endpoints
- **MongoDB Atlas** or **Firestore** for database
- **Cloud CDN** for global distribution
- **Cloud DNS** for domain management

## Implementation Plan

### Phase 1: Basic Setup (Week 1-2)
1. **Set up MongoDB Atlas**
   - Create cluster (free tier M0)
   - Configure database users and IP whitelist
   - Set up database connections

2. **Deploy API to Vercel**
   - Configure environment variables
   - Set up API routes
   - Test database connectivity

3. **Connect Frontend to Backend**
   - Configure API endpoints in Netlify build
   - Set up CORS for cross-origin requests
   - Implement authentication flow

### Phase 2: Optimization (Week 3-4)
1. **Performance Optimization**
   - Implement connection pooling
   - Add Redis caching layer
   - Configure database indexes

2. **Security Hardening**
   - Set up JWT authentication
   - Configure rate limiting
   - Implement request validation

3. **Monitoring & Logging**
   - Set up error tracking (Sentry)
   - Configure performance monitoring
   - Implement analytics collection

### Phase 3: Scaling (Week 5-6)
1. **Database Scaling**
   - Configure MongoDB sharding
   - Implement read replicas
   - Set up automated backups

2. **API Scaling**
   - Implement caching strategies
   - Configure load balancing
   - Set up auto-scaling rules

## Directory Structure

```
llama-wool-farm/
├── frontend/                  # Netlify static site
│   ├── dist/                 # Built assets
│   └── public/               # Static files
├── backend/                  # Vercel serverless functions
│   ├── api/                  # API endpoints
│   ├── schemas/              # MongoDB schemas
│   ├── middleware/           # Authentication, validation
│   ├── utils/                # Helper functions
│   └── config/               # Database configuration
└── shared/                   # Shared types and utilities
```

## Environment Configuration

### MongoDB Atlas Configuration
```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  },
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret",
    "NODE_ENV": "production"
  }
}
```

## Cost Estimation

### Monthly Costs (USD)
| Service | Free Tier | Basic Plan | Production |
|---------|-----------|------------|------------|
| MongoDB Atlas | $0 (512MB) | $9 (2GB) | $57 (10GB) |
| Vercel | $0 (100GB) | $20 (1TB) | $40 (1TB) |
| **Total** | **$0** | **$29** | **$97** |

### Alternative Costs
| Service | Monthly Cost |
|---------|--------------|
| Railway | $5-20 |
| AWS Lambda + Atlas | $10-50 |
| Google Cloud Functions + Atlas | $15-45 |

## Security Considerations

### 1. Database Security
- Enable MongoDB authentication
- Use connection string with credentials
- Configure IP whitelisting
- Enable audit logging

### 2. API Security
- Implement JWT authentication
- Use HTTPS for all requests
- Configure CORS properly
- Implement rate limiting
- Validate all inputs

### 3. Environment Security
- Use environment variables for secrets
- Rotate credentials regularly
- Monitor for security vulnerabilities
- Implement proper logging

## Monitoring & Analytics

### 1. Application Monitoring
- **Vercel Analytics**: Built-in performance monitoring
- **MongoDB Atlas Monitoring**: Database performance tracking
- **Sentry**: Error tracking and performance monitoring

### 2. Custom Analytics
- Game event tracking
- User behavior analysis
- Performance metrics
- Business metrics

## Backup & Disaster Recovery

### 1. Database Backups
- MongoDB Atlas: Automatic daily backups
- Point-in-time recovery available
- Cross-region backup replication

### 2. Code Backups
- GitHub repository for version control
- Vercel automatic deployments
- Multiple environment staging

## Deployment Pipeline

### 1. Development Flow
```
Local Development → GitHub → Vercel Deployment → Production
```

### 2. CI/CD Pipeline
- GitHub Actions for automated testing
- Vercel preview deployments for pull requests
- Automated database migrations
- Performance testing before production

## Getting Started

### 1. Set Up MongoDB Atlas
1. Create account at mongodb.com
2. Create new cluster (choose free tier)
3. Create database user and get connection string
4. Whitelist your IP addresses

### 2. Set Up Vercel
1. Create account at vercel.com
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy your API functions

### 3. Connect Everything
1. Update frontend to use Vercel API endpoints
2. Test authentication flow
3. Verify database connectivity
4. Monitor performance

## Next Steps

1. **Immediate**: Set up MongoDB Atlas and Vercel
2. **Week 1**: Deploy basic API endpoints
3. **Week 2**: Implement authentication and game state
4. **Week 3**: Add monitoring and optimization
5. **Week 4**: Performance testing and security hardening

This strategy provides a scalable, cost-effective solution that can grow with your application from development to production scale.