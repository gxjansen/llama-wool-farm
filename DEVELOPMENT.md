# Llama Wool Farm - Development Environment Setup Guide

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd llama-wool-farm

# Run automated setup
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start development server
npm run dev
```

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Latest version
- **OS**: macOS, Linux, or Windows (with WSL2)

### Optional but Recommended
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Phaser 3 TypeScript Support
- **Chrome DevTools** for PWA debugging
- **React Developer Tools** browser extension

## 🔧 Manual Setup

### 1. Install Dependencies

```bash
# Install project dependencies
npm install

# Install global tools (optional)
npm install -g serve webpack-cli jest
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# See Environment Variables section below
```

### 3. SSL Certificate Setup (for HTTPS development)

```bash
# Generate self-signed certificate
mkdir -p certs
openssl req -x509 -out certs/localhost.crt -keyout certs/localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")

# Trust certificate on macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/localhost.crt

# Trust certificate on Linux
sudo cp certs/localhost.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### 4. PWA Icon Generation

```bash
# Generate all required PWA icons from source
npm run generate-icons
```

## 🌐 Environment Variables

Create a `.env` file in the project root:

```env
# Development Environment
NODE_ENV=development
PORT=3000
HTTPS=true

# API Configuration
API_URL=http://localhost:8080
WS_URL=ws://localhost:8080

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_SERVICE_WORKER=true
ENABLE_PWA=true
ENABLE_MULTIPLAYER=false

# Build Configuration
SOURCE_MAP=true
BUNDLE_ANALYZER=false

# Performance
WEBPACK_CACHE=true
BABEL_CACHE=true

# Testing
TEST_TIMEOUT=10000
COVERAGE_THRESHOLD=80
```

## 🏃 Development Commands

### Development Server
```bash
# Start dev server (http://localhost:3000)
npm run dev

# Start with HTTPS
HTTPS=true npm run dev

# Start with specific port
PORT=8080 npm run dev

# Start with bundle analyzer
npm run dev -- --analyze
```

### Building
```bash
# Production build
npm run build

# Build with analysis
npm run build:analyze

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # With coverage report

# Watch mode
npm test -- --watch

# Debug mode
npm test -- --detectOpenHandles --verbose
```

### Code Quality
```bash
# Linting
npm run lint       # Check for issues
npm run lint:fix   # Auto-fix issues

# Type checking
npm run type-check

# Format code
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json}"

# Pre-commit validation
npm run validate
```

### Serving Production Build
```bash
# Build and serve locally
npm run build
npm run serve

# Serve with HTTPS
HTTPS=true npm run serve
```

## 🔍 Debugging

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Enable device emulation for mobile testing
3. Use Application tab for:
   - Service Worker inspection
   - Manifest validation
   - Storage debugging
   - Cache inspection

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--detectOpenHandles"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Performance Profiling

```bash
# Enable webpack bundle analyzer
npm run build:analyze

# Profile runtime performance
# Use Chrome DevTools Performance tab

# Memory profiling
# Use Chrome DevTools Memory tab
```

## 🐳 Docker Development (Optional)

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

```bash
# Build and run
docker build -f Dockerfile.dev -t llama-farm-dev .
docker run -p 3000:3000 -v $(pwd):/app llama-farm-dev
```

## 📱 PWA Development

### Testing PWA Features

1. **Install as PWA**:
   - Open https://localhost:3000 in Chrome
   - Click install icon in address bar
   - Test offline functionality

2. **Service Worker**:
   ```javascript
   // Check registration
   navigator.serviceWorker.ready.then(reg => console.log(reg))
   
   // Force update
   navigator.serviceWorker.getRegistration().then(reg => reg.update())
   ```

3. **Offline Testing**:
   - Chrome DevTools → Network → Offline
   - Test game functionality
   - Verify cached assets load

### Mobile Testing

```bash
# Get local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from mobile device
# https://<your-ip>:3000
```

## 🔌 Browser Extensions

Recommended for development:

1. **React Developer Tools**
2. **Redux DevTools**
3. **Lighthouse** (built into Chrome)
4. **Web Vitals Extension**

## 🐛 Common Issues

### Certificate Issues
```bash
# Regenerate certificates
rm -rf certs
./scripts/setup-dev.sh --certs-only

# Clear browser certificate cache
# Chrome: chrome://settings/security
```

### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Module Resolution Issues
```bash
# Clear caches
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Service Worker Issues
```bash
# Unregister all service workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
})

# Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

## 🔗 Useful Links

- [Phaser 3 Documentation](https://phaser.io/phaser3)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Webpack Documentation](https://webpack.js.org/concepts/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## 📧 Support

For development support:
- Check existing issues on GitHub
- Join our Discord server
- Email: dev@llamawoolfarm.com