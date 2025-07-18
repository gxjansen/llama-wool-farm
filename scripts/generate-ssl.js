#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate self-signed SSL certificates for local HTTPS development
 */

const sslDir = path.join(__dirname, '..', 'ssl');
const keyPath = path.join(sslDir, 'server.key');
const certPath = path.join(sslDir, 'server.crt');

// Create SSL directory if it doesn't exist
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
  console.log('✅ Created SSL directory');
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('⚠️  SSL certificates already exist');
  console.log('   To regenerate, delete the ssl/ directory and run this script again');
  process.exit(0);
}

try {
  console.log('🔐 Generating self-signed SSL certificates for local development...');

  // Generate private key
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });

  // Generate certificate signing request with predefined values
  const subjectString = '/C=US/ST=State/L=City/O=LlamaWoolFarm/CN=localhost';
  
  // Generate self-signed certificate (valid for 365 days)
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "${subjectString}"`,
    { stdio: 'inherit' }
  );

  // Create a certificate configuration file for better browser compatibility
  const certConfigPath = path.join(sslDir, 'cert.conf');
  const certConfig = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Llama Wool Farm Dev
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
DNS.4 = ::1
IP.1 = 127.0.0.1
IP.2 = ::1
`;

  fs.writeFileSync(certConfigPath, certConfig.trim());

  // Regenerate certificate with extended configuration
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -config "${certConfigPath}" -extensions v3_req`,
    { stdio: 'inherit' }
  );

  // Add to .gitignore if not already present
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath) 
    ? fs.readFileSync(gitignorePath, 'utf-8') 
    : '';

  if (!gitignoreContent.includes('ssl/')) {
    fs.appendFileSync(gitignorePath, '\n# SSL certificates for local development\nssl/\n');
    console.log('✅ Added ssl/ to .gitignore');
  }

  console.log('\n✅ SSL certificates generated successfully!');
  console.log('\n📝 Certificate details:');
  console.log(`   Private Key: ${keyPath}`);
  console.log(`   Certificate: ${certPath}`);
  console.log('\n🌐 Your local development server will now run on HTTPS');
  console.log('   Access your game at: https://localhost:3000');
  console.log('\n⚠️  Note: Browsers will show a security warning for self-signed certificates.');
  console.log('   This is normal for local development. Click "Advanced" and proceed.\n');

  // Platform-specific instructions
  if (process.platform === 'darwin') {
    console.log('🍎 macOS: To trust the certificate system-wide:');
    console.log(`   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${certPath}"`);
  } else if (process.platform === 'win32') {
    console.log('🪟 Windows: To trust the certificate:');
    console.log('   1. Double-click the certificate file');
    console.log('   2. Click "Install Certificate"');
    console.log('   3. Select "Local Machine" and follow the wizard');
  } else {
    console.log('🐧 Linux: To trust the certificate:');
    console.log(`   sudo cp "${certPath}" /usr/local/share/ca-certificates/localhost.crt`);
    console.log('   sudo update-ca-certificates');
  }

} catch (error) {
  console.error('❌ Error generating SSL certificates:', error.message);
  console.error('\n💡 Make sure OpenSSL is installed on your system:');
  console.error('   macOS: brew install openssl');
  console.error('   Ubuntu/Debian: sudo apt-get install openssl');
  console.error('   Windows: Install Git Bash or use WSL');
  process.exit(1);
}

// Cleanup temporary config file
const certConfigPath = path.join(sslDir, 'cert.conf');
if (fs.existsSync(certConfigPath)) {
  fs.unlinkSync(certConfigPath);
}