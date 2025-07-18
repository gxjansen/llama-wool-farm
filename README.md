# 🦙 Llama Wool Farm - PWA Idle Clicker Game

A progressive web app idle clicker game built with Phaser.js, TypeScript, and modern web technologies.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server (http://localhost:8080)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Generate PWA icons
npm run generate-icons
```

## 🏗️ Architecture Overview

### Technology Stack
- **Game Engine**: Phaser.js 3.80.1
- **Language**: TypeScript 5.3 (strict mode)
- **UI Framework**: React 18.2 (for overlays)
- **State Management**: Redux Toolkit + Custom Game State
- **Build Tool**: Webpack 5 with PWA plugins
- **Backend**: Node.js 18 LTS + Express.js
- **Database**: MongoDB Atlas
- **Cache**: Redis
- **PWA**: Workbox 7.0

### Project Structure
```
src/
├── game/           # Phaser game configuration
├── core/           # Framework-agnostic game logic
│   ├── entities/   # Llama, Wool, Upgrade classes
│   ├── managers/   # Game systems management
│   └── systems/    # Production, prestige, offline
├── scenes/         # Phaser scenes
├── objects/        # Phaser game objects
├── ui/             # React UI components
├── services/       # External integrations
├── utils/          # Utility functions
└── types/          # TypeScript definitions
```

## 🎮 Game Features

### Core Mechanics
- **10 Wool Types**: From Basic to Quantum wool
- **Idle Production**: Automatic wool generation
- **Offline Progress**: Continue earning while away
- **Prestige System**: Soul Shears for permanent bonuses
- **Upgrades**: Buildings, automation, and research

### PWA Features
- **Offline Play**: Full game functionality without internet
- **Installable**: Add to home screen on any device
- **Auto-Save**: Local and cloud save synchronization
- **Push Notifications**: Event and milestone alerts
- **Background Sync**: Seamless data synchronization

## 📊 Performance Targets

- **FPS**: 60fps on mid-range devices
- **Load Time**: <3 seconds initial load
- **Bundle Size**: <2MB initial, <5MB total
- **Memory**: <150MB active, <50MB idle
- **Battery**: <15%/hr active, <5%/hr background
- **Lighthouse**: 95+ PWA score

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Visit the game URL
2. Click install icon in address bar
3. Follow installation prompts

### Mobile (iOS/Android)
1. Open in Safari/Chrome
2. Tap "Share" → "Add to Home Screen"
3. Game runs like native app

## 🚀 Deployment

```bash
# Build for production
npm run build

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## 📖 Documentation

- [Architecture Overview](docs/architecture/README.md)
- [Game Design Document](docs/game-design/README.md)
- [API Documentation](docs/technical/api.md)
- [Testing Strategy](docs/technical/testing-strategy.md)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.