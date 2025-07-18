# Deployment Guide - Supabase Integration

This guide covers deploying the Llama Wool Farm API with Supabase backend services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Edge Functions Deployment](#edge-functions-deployment)
6. [Netlify Functions Deployment](#netlify-functions-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Supabase account and project
- Netlify account (optional, for serverless functions)
- GitHub repository with actions enabled
- Docker (for containerized deployment)

## Supabase Setup

### 1. Create Supabase Project

1. Visit [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Choose your region and database password
4. Wait for project initialization

### 2. Install Supabase CLI

```bash
npm install -g @supabase/cli
```

### 3. Initialize Supabase in Your Project

```bash
cd backend
supabase init
supabase login
supabase link --project-ref your-project-id
```

### 4. Configure Project Settings

```bash
# Create local configuration
supabase start

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.supabase.example .env
```

### 2. Configure Supabase Variables

Edit `.env` with your Supabase project details:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
```

### 3. Set Environment Variables

For production deployment, configure these secrets:

**GitHub Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL_PRODUCTION`
- `SUPABASE_ANON_KEY_PRODUCTION`

**Netlify Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `DATABASE_URL`

## Database Setup

### 1. Create Database Schema

```sql
-- Create game tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    score BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_states_user_id ON game_states(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_category_score ON leaderboards(category, score DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. Apply Migrations

```bash
# Push schema to Supabase
supabase db push

# Generate migration files
supabase db diff --schema public

# Apply migrations
supabase migration up
```

### 3. Set Up Row Level Security (RLS)

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own game state" ON game_states
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own game state" ON game_states
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game state" ON game_states
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboards" ON leaderboards
    FOR SELECT TO authenticated;

CREATE POLICY "Users can insert own scores" ON leaderboards
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Edge Functions Deployment

### 1. Create Edge Functions

```javascript
// supabase/functions/game-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('game_states')
      .select('*')

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy game-api

# Deploy with secrets
supabase secrets set API_KEY=your-api-key
supabase functions deploy game-api --no-verify-jwt
```

### 3. Test Edge Functions

```bash
# Test locally
supabase functions serve

# Test remotely
curl -X POST https://your-project-id.functions.supabase.co/game-api \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Netlify Functions Deployment

### 1. Create Netlify Functions

```javascript
// functions/api.js
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')

    if (error) {
      throw error
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ data })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}
```

### 2. Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 3. Configure Netlify Environment

Add these environment variables in Netlify dashboard:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NODE_ENV=production`

## CI/CD Pipeline

### 1. GitHub Actions Setup

The repository includes a comprehensive GitHub Actions workflow at `.github/workflows/supabase-deploy.yml`.

### 2. Required Secrets

Configure these secrets in your GitHub repository:

```yaml
# Supabase
SUPABASE_ACCESS_TOKEN: your-access-token
SUPABASE_PROJECT_ID: your-project-id
SUPABASE_DB_PASSWORD: your-db-password
SUPABASE_URL_STAGING: https://staging-project.supabase.co
SUPABASE_URL_PRODUCTION: https://production-project.supabase.co
SUPABASE_ANON_KEY_STAGING: your-staging-anon-key
SUPABASE_ANON_KEY_PRODUCTION: your-production-anon-key

# Netlify (optional)
NETLIFY_AUTH_TOKEN: your-netlify-token
NETLIFY_SITE_ID: your-site-id
NETLIFY_FUNCTIONS_URL: https://your-site.netlify.app

# Monitoring
SLACK_WEBHOOK_URL: your-slack-webhook
SNYK_TOKEN: your-snyk-token
```

### 3. Deployment Workflow

The pipeline includes:

1. **Test Phase**: Linting, unit tests, integration tests
2. **Build Phase**: Application build and artifact creation
3. **Deploy Phase**: Supabase and Netlify deployment
4. **Security Phase**: Security scanning and audit
5. **Monitoring Phase**: Performance testing and monitoring

## Monitoring & Observability

### 1. Health Checks

```bash
# Check API health
curl https://your-project-id.functions.supabase.co/health

# Check database connectivity
curl https://your-project-id.functions.supabase.co/db-health
```

### 2. Logging

Configure structured logging:

```javascript
// src/config/logger.js
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
})

module.exports = logger
```

### 3. Metrics and Monitoring

```javascript
// src/middleware/metrics.js
const client = require('prom-client')

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

module.exports = {
  httpRequestDuration,
  httpRequestTotal
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   supabase status
   
   # Reset database
   supabase db reset
   ```

2. **Edge Function Deployment Errors**
   ```bash
   # Check function logs
   supabase functions logs game-api
   
   # Test locally
   supabase functions serve game-api
   ```

3. **Authentication Issues**
   ```bash
   # Check auth configuration
   supabase auth status
   
   # Reset auth
   supabase auth reset
   ```

### Debug Commands

```bash
# Check Supabase project status
supabase status

# View logs
supabase logs

# Test database connection
supabase db ping

# Validate schema
supabase db diff

# Check function status
supabase functions list
```

### Performance Optimization

1. **Database Optimization**
   - Use appropriate indexes
   - Optimize query patterns
   - Use connection pooling

2. **Function Optimization**
   - Minimize cold starts
   - Use caching strategies
   - Optimize bundle size

3. **API Optimization**
   - Implement rate limiting
   - Use compression
   - Cache responses

## Production Checklist

Before going to production:

- [ ] Database migrations applied
- [ ] Row Level Security policies configured
- [ ] Environment variables set
- [ ] Edge functions deployed
- [ ] Health checks implemented
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Documentation updated

## Support

For deployment issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the [GitHub Actions logs](https://github.com/your-repo/actions)
3. Check the [Netlify deployment logs](https://app.netlify.com)
4. Join the [Supabase Discord](https://discord.supabase.com)
5. Open an issue in the repository

## Security Considerations

- Never commit secrets to version control
- Use environment variables for sensitive data
- Implement proper authentication and authorization
- Regular security audits and updates
- Monitor for suspicious activities
- Use HTTPS in production
- Implement proper CORS policies
- Regular backup and recovery testing