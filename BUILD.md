# Llama Wool Farm - Build Instructions

## Prerequisites

- Node.js 18+ and npm 9+
- Modern web browser with WebGL support

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install additional dependencies for icon generation (optional):
```bash
npm install --save-dev canvas
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The game will be available at `http://localhost:3000`

## Production Build

Create an optimized production build:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Build Analysis

To analyze the bundle size:
```bash
npm run build:analyze
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Linting

Check code style:
```bash
npm run lint
```

Fix code style issues:
```bash
npm run lint:fix
```

## Type Checking

Run TypeScript type checking:
```bash
npm run type-check
```

## PWA Features

The build includes:
- Service Worker for offline play
- Web App Manifest for installation
- Automatic icon generation for all platforms
- Push notification support
- Background sync for game saves

## Icon Generation

Generate all PWA icons and splash screens:
```bash
npm run generate-icons
```

This requires the `canvas` package to be installed.

## Deployment

The production build in `dist/` can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Google Cloud Storage

## Environment Variables

Create a `.env` file for environment-specific configuration:
```env
# Analytics
VITE_GA_ID=your-google-analytics-id

# API endpoints
VITE_API_URL=https://api.llamawoolfarm.com

# Feature flags
VITE_ENABLE_MULTIPLAYER=false
VITE_ENABLE_ADS=false
```

## Performance Optimization

The build is optimized for:
- Code splitting (separate chunks for Phaser and game code)
- Tree shaking to remove unused code
- Asset optimization (images, fonts)
- Caching strategies for offline play
- Lazy loading of game scenes

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers with WebGL support

## Troubleshooting

### Build fails with memory error
Increase Node.js memory limit:
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

### Service Worker not updating
Clear browser cache and service worker in DevTools

### WebGL not supported error
Ensure your browser supports WebGL 2.0

## CI/CD

The project includes GitHub Actions workflows for:
- Automated testing on pull requests
- Building and deploying to production
- Bundle size checks
- Lighthouse performance audits