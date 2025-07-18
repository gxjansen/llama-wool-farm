# 🚀 Supabase Quick Start Guide

## 📋 Overview

This guide will help you quickly set up and run the Llama Wool Farm backend with Supabase. Follow these steps to get your development environment up and running in minutes.

## 🎯 Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed
- **npm 9+** or **yarn 1.22+**
- **Docker** (optional, for local development)
- **Git** for version control
- **Supabase CLI** for project management

## 🔧 Quick Setup (5 minutes)

### 1. Install Supabase CLI
```bash
# Install globally
npm install -g @supabase/cli

# Verify installation
supabase --version
```

### 2. Create Supabase Project
```bash
# Option A: Create via CLI
supabase projects create llama-wool-farm

# Option B: Create via Dashboard
# Visit: https://supabase.com/dashboard
# Click "New Project" and follow the wizard
```

### 3. Clone and Setup Repository
```bash
# Clone repository
git clone https://github.com/yourusername/llama-wool-farm.git
cd llama-wool-farm/backend

# Install dependencies
npm install

# Initialize Supabase
supabase init
```

### 4. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

**Required Environment Variables:**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Application Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### 5. Setup Database Schema
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply database schema
supabase db push

# Or manually run the schema files
psql -h db.your-project.supabase.co -p 5432 -d postgres -U postgres -f schema.sql
```

### 6. Start Development Server
```bash
# Start the API server
npm run dev

# The server will be available at http://localhost:3000
```

## 📊 Database Schema Setup

### Automated Schema Setup
```bash
# Run the schema setup script
npm run setup:db

# Or manually execute each file
node scripts/setup-database.js
```

### Manual Schema Creation
Create these tables in your Supabase SQL editor:

```sql
-- 1. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'default_llama.png',
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    wool_produced INTEGER DEFAULT 0 CHECK (wool_produced >= 0),
    coins_earned INTEGER DEFAULT 0 CHECK (coins_earned >= 0),
    daily_streak INTEGER DEFAULT 0 CHECK (daily_streak >= 0),
    notifications_enabled BOOLEAN DEFAULT true,
    show_on_leaderboard BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Game states table
CREATE TABLE game_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    wool INTEGER DEFAULT 0 CHECK (wool >= 0),
    coins INTEGER DEFAULT 100 CHECK (coins >= 0),
    feed INTEGER DEFAULT 50 CHECK (feed >= 0),
    wool_production_rate DECIMAL(10,2) DEFAULT 1.0,
    last_saved TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_game_states_player_id ON game_states(player_id);
CREATE INDEX idx_players_wool_produced ON players(wool_produced DESC);
```

## 🔐 Authentication Setup

### 1. Configure Supabase Auth
```bash
# In Supabase Dashboard > Authentication > Settings
# Enable Email/Password authentication
# Set JWT expiry to 1 hour
# Configure email templates
```

### 2. Test Authentication
```bash
# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test user login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## 🎮 Basic API Testing

### 1. Health Check
```bash
# Test server health
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 2. Player Operations
```bash
# Create a player profile (requires authentication)
curl -X POST http://localhost:3000/api/players/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "displayName": "Test Player"
  }'

# Get player profile
curl -X GET http://localhost:3000/api/players/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Game State Operations
```bash
# Get game state
curl -X GET http://localhost:3000/api/game/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update game state
curl -X PUT http://localhost:3000/api/game/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wool": 150,
    "coins": 200,
    "feed": 75
  }'
```

## 🔄 Real-time Testing

### 1. WebSocket Connection Test
```javascript
// test-realtime.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test real-time subscription
const testRealtime = async () => {
  const channel = supabase
    .channel('test-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'game_states'
    }, (payload) => {
      console.log('Real-time update:', payload);
    })
    .subscribe();

  console.log('Subscribed to real-time updates');
  
  // Keep connection alive
  setTimeout(() => {
    channel.unsubscribe();
    console.log('Unsubscribed from real-time updates');
  }, 10000);
};

testRealtime();
```

```bash
# Run real-time test
node test-realtime.js
```

## 📊 Development Tools

### 1. Database Management
```bash
# View database with Supabase CLI
supabase db diff

# Reset database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

### 2. API Documentation
```bash
# Generate API documentation
npm run docs:generate

# Serve documentation
npm run docs:serve
# Visit: http://localhost:8080/docs
```

### 3. Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="Player API"
```

## 🐳 Docker Setup (Optional)

### 1. Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 2. Run with Docker
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down
```

## 🎯 Sample Data Setup

### 1. Seed Database
```bash
# Run seed script
npm run seed

# Or manually run
node scripts/seed-database.js
```

### 2. Sample Seed Script
```javascript
// scripts/seed-database.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const seedData = async () => {
  // Create sample users
  const users = [
    {
      email: 'alice@example.com',
      password: 'password123',
      first_name: 'Alice',
      last_name: 'Johnson'
    },
    {
      email: 'bob@example.com',
      password: 'password123',
      first_name: 'Bob',
      last_name: 'Smith'
    }
  ];

  for (const user of users) {
    const { data: { user: createdUser } } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

    // Create player profile
    await supabase.from('players').insert({
      user_id: createdUser.id,
      username: user.first_name.toLowerCase(),
      display_name: `${user.first_name} ${user.last_name}`,
      level: Math.floor(Math.random() * 20) + 1,
      wool_produced: Math.floor(Math.random() * 5000),
      coins_earned: Math.floor(Math.random() * 10000)
    });

    console.log(`Created user: ${user.email}`);
  }

  console.log('Database seeded successfully!');
};

seedData().catch(console.error);
```

## 🔍 Common Issues & Solutions

### 1. Connection Issues
```bash
# Check Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/users?select=*&limit=1"

# Check if RLS is blocking queries
# Temporarily disable RLS for testing:
# ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### 2. Authentication Issues
```bash
# Verify JWT token
curl -X GET "https://your-project.supabase.co/auth/v1/user" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check if user exists
curl -X GET "https://your-project.supabase.co/rest/v1/users?select=*" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

### 3. Real-time Issues
```javascript
// Check real-time connection
const testConnection = async () => {
  const channel = supabase
    .channel('test')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users'
    }, (payload) => {
      console.log('Connected to real-time!', payload);
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });
};
```

## 📝 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# Add tests
# Test locally

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature
```

### 2. Database Changes
```bash
# Create migration
supabase migration new add_new_table

# Edit migration file
# supabase/migrations/20240101000000_add_new_table.sql

# Apply migration
supabase db push

# Generate new types
supabase gen types typescript --local > types/supabase.ts
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Set production environment variables
export NODE_ENV=production
export SUPABASE_URL=https://your-prod-project.supabase.co
export SUPABASE_ANON_KEY=your-prod-anon-key
export SUPABASE_SERVICE_KEY=your-prod-service-key
```

### 2. Build and Deploy
```bash
# Build for production
npm run build

# Start production server
npm start

# Or with PM2
pm2 start ecosystem.config.js --env production
```

## 🔗 Useful Resources

### Official Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Development Tools
- [Supabase Dashboard](https://supabase.com/dashboard)
- [PostgreSQL Admin](https://www.pgadmin.org/)
- [Postman Collections](./postman/)

### Community Resources
- [Supabase Discord](https://discord.supabase.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/supabase)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## 📞 Support

If you encounter issues:

1. **Check the logs**: `npm run logs`
2. **Check Supabase status**: https://status.supabase.com/
3. **Review documentation**: This guide and official docs
4. **Search existing issues**: GitHub and Stack Overflow
5. **Create an issue**: With detailed error information

## ✅ Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed
- [ ] Supabase project created
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] Development server started
- [ ] Authentication tested
- [ ] API endpoints tested
- [ ] Real-time features tested
- [ ] Sample data seeded

**Congratulations! 🎉** You now have a fully functional Supabase-powered Llama Wool Farm backend running locally. You can start building features, adding game mechanics, and scaling your application.

---

**Next Steps:**
- Review the [API Documentation](./API_DOCUMENTATION.md)
- Study the [Architecture Overview](./ARCHITECTURE.md)
- Plan your [Migration Strategy](./MIGRATION_GUIDE.md)
- Explore [Supabase Benefits](./SUPABASE_BENEFITS.md)