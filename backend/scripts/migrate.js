#!/usr/bin/env node

const { connect, disconnect, initialize, migrations, validateSchemas, getStats } = require('../schemas');

/**
 * Database Migration Script
 * Handles database setup, initialization, and sample data creation
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/llama-wool-farm';

async function runMigrations() {
  console.log('🦙 Starting Llama Wool Farm Database Migration...\n');
  
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Validate schemas
    console.log('🔍 Validating schemas...');
    const validationResults = await validateSchemas();
    if (validationResults.all === 'passed') {
      console.log('✅ All schemas validated successfully');
    } else {
      console.log('❌ Schema validation failed:', validationResults.error);
      process.exit(1);
    }
    console.log('');
    
    // Initialize database (create indexes)
    console.log('📊 Creating database indexes...');
    await initialize();
    console.log('✅ Database indexes created successfully\n');
    
    // Create admin user if needed
    console.log('👨‍💼 Creating admin user...');
    const adminResult = await migrations.createAdminUser(
      'admin@llamawoolfarm.com',
      'AdminPass123!'
    );
    
    if (adminResult.success) {
      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@llamawoolfarm.com');
      console.log('   Password: AdminPass123!');
    } else {
      console.log('ℹ️  Admin user already exists or creation failed:', adminResult.message);
    }
    console.log('');
    
    // Seed sample data
    console.log('🌱 Seeding sample data...');
    const seedResult = await migrations.seedSampleData();
    
    if (seedResult.success) {
      console.log('✅ Sample data created successfully');
    } else {
      console.log('❌ Sample data creation failed:', seedResult.message);
    }
    console.log('');
    
    // Show database statistics
    console.log('📈 Database Statistics:');
    const stats = await getStats();
    console.log(`   Users: ${stats.users || 0}`);
    console.log(`   Players: ${stats.players || 0}`);
    console.log(`   Game States: ${stats.gameStates || 0}`);
    console.log(`   Leaderboards: ${stats.leaderboards || 0}`);
    console.log(`   Analytics Events: ${stats.analyticsEvents || 0}`);
    console.log(`   Total Documents: ${stats.total || 0}`);
    console.log('');
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your .env file with the MongoDB URI');
    console.log('2. Start your API server');
    console.log('3. Test the authentication endpoints');
    console.log('4. Connect your frontend to the API');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await disconnect();
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    console.log('🔧 Initializing database (indexes only)...');
    connect(MONGODB_URI)
      .then(() => initialize())
      .then(() => {
        console.log('✅ Database initialized successfully');
        return disconnect();
      })
      .catch(error => {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
      });
    break;
    
  case 'seed':
    console.log('🌱 Seeding sample data...');
    connect(MONGODB_URI)
      .then(() => migrations.seedSampleData())
      .then(result => {
        console.log(result.success ? '✅ Sample data created' : '❌ Seeding failed:', result.message);
        return disconnect();
      })
      .catch(error => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
      });
    break;
    
  case 'validate':
    console.log('🔍 Validating schemas...');
    connect(MONGODB_URI)
      .then(() => validateSchemas())
      .then(results => {
        console.log('Validation results:', results);
        return disconnect();
      })
      .catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
      });
    break;
    
  case 'stats':
    console.log('📈 Getting database statistics...');
    connect(MONGODB_URI)
      .then(() => getStats())
      .then(stats => {
        console.log('Database Statistics:', stats);
        return disconnect();
      })
      .catch(error => {
        console.error('❌ Stats failed:', error);
        process.exit(1);
      });
    break;
    
  case 'admin':
    const email = args[1] || 'admin@llamawoolfarm.com';
    const password = args[2] || 'AdminPass123!';
    
    console.log(`👨‍💼 Creating admin user: ${email}`);
    connect(MONGODB_URI)
      .then(() => migrations.createAdminUser(email, password))
      .then(result => {
        console.log(result.success ? '✅ Admin user created' : '❌ Admin creation failed:', result.message);
        return disconnect();
      })
      .catch(error => {
        console.error('❌ Admin creation failed:', error);
        process.exit(1);
      });
    break;
    
  case 'help':
    console.log('🦙 Llama Wool Farm Database Migration Tool\n');
    console.log('Usage: node migrate.js [command] [options]\n');
    console.log('Commands:');
    console.log('  (no command)  - Run complete migration');
    console.log('  init          - Initialize database (create indexes)');
    console.log('  seed          - Seed sample data');
    console.log('  validate      - Validate schemas');
    console.log('  stats         - Show database statistics');
    console.log('  admin [email] [password] - Create admin user');
    console.log('  help          - Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  MONGODB_URI   - MongoDB connection string');
    console.log('                  (default: mongodb://localhost:27017/llama-wool-farm)');
    break;
    
  default:
    runMigrations();
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted, cleaning up...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Migration terminated, cleaning up...');
  await disconnect();
  process.exit(0);
});