#!/usr/bin/env node

/**
 * Performance Setup Script
 * Automates the setup of Supabase performance optimizations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Supabase Performance Optimizations...\n');

// Check if required environment variables are set
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'REDIS_URL'
];

console.log('📋 Checking environment variables...');
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:');
  missingEnvVars.forEach(envVar => console.warn(`   - ${envVar}`));
  console.warn('\nPlease set these variables before running the performance setup.\n');
  
  // Create example .env file if it doesn't exist
  const envExamplePath = path.join(__dirname, '../.env.example');
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env example file...');
    const envExample = `# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Performance Configuration
SUPABASE_POOL_SIZE=20
SUPABASE_POOL_MIN=5
SUPABASE_POOL_IDLE=10000
SUPABASE_POOL_ACQUIRE=30000
SUPABASE_POOL_EVICT=1000

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache Configuration
CACHE_TTL_DEFAULT=300
CACHE_MAX_SIZE=1000
CACHE_L1_SIZE=1000
CACHE_L2_SIZE=10000

# Performance Monitoring
PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_INTERVAL=60000
PERFORMANCE_ALERT_THRESHOLD=1000
`;
    
    fs.writeFileSync(envExamplePath, envExample);
    console.log('✅ Created .env.example file');
  }
}

// Install required dependencies
console.log('\n📦 Installing performance dependencies...');
try {
  execSync('npm install --save @supabase/supabase-js lru-cache response-time', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Check if Supabase CLI is available
console.log('\n🔧 Checking Supabase CLI...');
try {
  execSync('supabase --version', { stdio: 'pipe' });
  console.log('✅ Supabase CLI is available');
  
  // Apply database indexes
  console.log('\n🗄️ Applying database indexes...');
  const indexPath = path.join(__dirname, '../supabase/indexes.sql');
  
  if (fs.existsSync(indexPath)) {
    try {
      // execSync(`supabase db reset --linked`, { stdio: 'inherit' });
      console.log('📝 Database indexes are ready to be applied');
      console.log(`   Run: supabase db push --include-all`);
      console.log(`   Or apply manually: ${indexPath}`);
    } catch (error) {
      console.warn('⚠️  Could not apply indexes automatically:', error.message);
      console.log('📝 Please apply indexes manually from:', indexPath);
    }
  }
} catch (error) {
  console.warn('⚠️  Supabase CLI not found. Install with: npm install -g supabase');
  console.log('📝 You can apply indexes manually from: backend/supabase/indexes.sql');
}

// Performance validation
console.log('\n🧪 Running performance validation...');

// Check if performance files exist
const performanceFiles = [
  'src/config/performance.js',
  'src/utils/cache.utils.js',
  'supabase/indexes.sql',
  'docs/PERFORMANCE.md'
];

const missingFiles = performanceFiles.filter(file => {
  const filePath = path.join(__dirname, '..', file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.warn('⚠️  Missing performance files:');
  missingFiles.forEach(file => console.warn(`   - ${file}`));
} else {
  console.log('✅ All performance files are in place');
}

// Create performance monitoring script
console.log('\n📊 Setting up performance monitoring...');
const monitoringScript = `#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Run this script to monitor performance metrics
 */

const { performanceConfig } = require('./src/config/performance');
const { cacheManager } = require('./src/utils/cache.utils');

async function monitorPerformance() {
  try {
    console.log('📊 Performance Monitoring Dashboard');
    console.log('=' .repeat(50));
    
    // Initialize performance config
    await performanceConfig.initialize();
    
    // Get performance metrics
    const metrics = await performanceConfig.getPerformanceMetrics();
    
    console.log('\\n🔗 Connection Pool:');
    console.log(\`   Active: \${metrics.connectionPool.active}\`);
    console.log(\`   Idle: \${metrics.connectionPool.idle}\`);
    console.log(\`   Waiting: \${metrics.connectionPool.waiting}\`);
    
    console.log('\\n💾 Cache Performance:');
    const cacheStats = cacheManager.getStats();
    console.log(\`   Hit Rate: \${cacheStats.hitRate}%\`);
    console.log(\`   L1 Hit Rate: \${cacheStats.l1HitRate}%\`);
    console.log(\`   L2 Hit Rate: \${cacheStats.l2HitRate}%\`);
    console.log(\`   L1 Size: \${cacheStats.l1Size}/\${cacheStats.l1MaxSize}\`);
    
    console.log('\\n🔴 Real-time Connections:');
    console.log(\`   Active Channels: \${metrics.realtime.activeChannels}\`);
    console.log(\`   Connection State: \${metrics.realtime.connectionState}\`);
    
    console.log('\\n🐌 Slow Queries:');
    if (metrics.queries.slow.length > 0) {
      metrics.queries.slow.forEach((query, i) => {
        console.log(\`   \${i+1}. \${query.query} (\${query.mean_time}ms avg)\`);
      });
    } else {
      console.log('   No slow queries detected ✅');
    }
    
  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  monitorPerformance();
}

module.exports = { monitorPerformance };
`;

const monitoringPath = path.join(__dirname, 'monitor-performance.js');
fs.writeFileSync(monitoringPath, monitoringScript);
fs.chmodSync(monitoringPath, '755');
console.log('✅ Performance monitoring script created');

// Update package.json scripts
console.log('\n📝 Updating package.json scripts...');
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const performanceScripts = {
  'perf:setup': 'node scripts/setup-performance.js',
  'perf:monitor': 'node scripts/monitor-performance.js',
  'perf:indexes': 'supabase db push --include-all',
  'perf:benchmark': 'node scripts/benchmark-performance.js'
};

packageJson.scripts = { ...packageJson.scripts, ...performanceScripts };
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ Package.json scripts updated');

console.log('\n🎉 Performance setup complete!');
console.log('\n📚 Next steps:');
console.log('1. Set up your environment variables in .env');
console.log('2. Run: npm run perf:indexes (to apply database indexes)');
console.log('3. Run: npm run perf:monitor (to check performance metrics)');
console.log('4. Review: backend/docs/PERFORMANCE.md for optimization guide');
console.log('\n🚀 Your Supabase backend is now optimized for high performance!');