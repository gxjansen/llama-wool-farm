import { PWAConfig, isPWAInstalled, isIOSSafari, canInstallPWA, getStorageEstimate, requestPersistentStorage } from '../../src/config/pwa.config';

describe('PWA Configuration', () => {
  // Mock window.matchMedia
  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  describe('PWAConfig', () => {
    it('should have service worker configuration', () => {
      expect(PWAConfig.serviceWorker).toBeDefined();
      expect(PWAConfig.serviceWorker.enabled).toBe(true);
      expect(PWAConfig.serviceWorker.src).toBe('/service-worker.js');
      expect(PWAConfig.serviceWorker.scope).toBe('/');
    });

    it('should have caching configuration', () => {
      expect(PWAConfig.caching).toBeDefined();
      expect(PWAConfig.caching.staticAssets).toContain('/index.html');
      expect(PWAConfig.caching.staticAssets).toContain('/offline.html');
      expect(PWAConfig.caching.gameAssets).toBeDefined();
      expect(PWAConfig.caching.expiration.images).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should have background sync configuration', () => {
      expect(PWAConfig.backgroundSync.enabled).toBe(true);
      expect(PWAConfig.backgroundSync.queues.gameSave).toBeDefined();
      expect(PWAConfig.backgroundSync.queues.gameSave.name).toBe('game-save-queue');
    });

    it('should have install prompt configuration', () => {
      expect(PWAConfig.installPrompt.enabled).toBe(true);
      expect(PWAConfig.installPrompt.minPlayTime).toBe(5 * 60 * 1000);
      expect(PWAConfig.installPrompt.dismissCooldown).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should have offline configuration', () => {
      expect(PWAConfig.offline.enabled).toBe(true);
      expect(PWAConfig.offline.fallbackPage).toBe('/offline.html');
      expect(PWAConfig.offline.features.gameplay).toBe(true);
    });
  });

  describe('isPWAInstalled', () => {
    beforeEach(() => {
      // Reset navigator.standalone
      Object.defineProperty(window.navigator, 'standalone', {
        writable: true,
        value: undefined,
      });
    });

    it('should return true when display-mode is standalone', () => {
      mockMatchMedia(true);
      expect(isPWAInstalled()).toBe(true);
    });

    it('should return false when display-mode is not standalone', () => {
      mockMatchMedia(false);
      expect(isPWAInstalled()).toBe(false);
    });

    it('should return true for iOS standalone mode', () => {
      mockMatchMedia(false);
      Object.defineProperty(window.navigator, 'standalone', {
        writable: true,
        value: true,
      });
      expect(isPWAInstalled()).toBe(true);
    });
  });

  describe('isIOSSafari', () => {
    const setUserAgent = (userAgent: string) => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: userAgent,
      });
    };

    it('should return true for iOS Safari', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      expect(isIOSSafari()).toBe(true);
    });

    it('should return false for iOS Chrome', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1');
      expect(isIOSSafari()).toBe(false);
    });

    it('should return false for Android Chrome', () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.86 Mobile Safari/537.36');
      expect(isIOSSafari()).toBe(false);
    });

    it('should return false for desktop browsers', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');
      expect(isIOSSafari()).toBe(false);
    });
  });

  describe('canInstallPWA', () => {
    beforeEach(() => {
      // Reset window properties
      delete (window as any).BeforeInstallPromptEvent;
    });

    it('should return true when BeforeInstallPromptEvent is available', () => {
      (window as any).BeforeInstallPromptEvent = class {};
      expect(canInstallPWA()).toBe(true);
    });

    it('should return true for iOS Safari', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });
      expect(canInstallPWA()).toBe(true);
    });

    it('should return false when neither condition is met', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
      });
      expect(canInstallPWA()).toBe(false);
    });
  });

  describe('getStorageEstimate', () => {
    it('should return storage estimate when API is available', async () => {
      const mockEstimate = {
        usage: 1000000,
        quota: 10000000,
      };
      
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: {
          estimate: jest.fn().mockResolvedValue(mockEstimate),
        },
      });

      const result = await getStorageEstimate();
      expect(result.usage).toBe(1000000);
      expect(result.quota).toBe(10000000);
      expect(result.percentage).toBe(10);
    });

    it('should return zeros when API is not available', async () => {
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: undefined,
      });

      const result = await getStorageEstimate();
      expect(result.usage).toBe(0);
      expect(result.quota).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe('requestPersistentStorage', () => {
    it('should return true when persistence is granted', async () => {
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: {
          persist: jest.fn().mockResolvedValue(true),
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(true);
    });

    it('should return false when persistence is denied', async () => {
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: {
          persist: jest.fn().mockResolvedValue(false),
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });

    it('should return false when API is not available', async () => {
      Object.defineProperty(navigator, 'storage', {
        writable: true,
        value: undefined,
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });
  });
});

describe('Service Worker Registration', () => {
  let mockServiceWorker: any;
  let mockRegistration: any;

  beforeEach(() => {
    // Mock service worker registration
    mockRegistration = {
      scope: '/',
      installing: null,
      waiting: null,
      active: null,
      update: jest.fn(),
      addEventListener: jest.fn(),
    };

    mockServiceWorker = {
      register: jest.fn().mockResolvedValue(mockRegistration),
      controller: null,
      addEventListener: jest.fn(),
      ready: Promise.resolve(mockRegistration),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorker,
    });
  });

  it('should register service worker successfully', async () => {
    const { registerServiceWorker } = await import('../../src/utils/serviceWorker');
    await registerServiceWorker();

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      '/service-worker.js',
      { scope: '/' }
    );
  });

  it('should handle registration errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    navigator.serviceWorker.register = jest.fn().mockRejectedValue(new Error('Registration failed'));

    const { registerServiceWorker } = await import('../../src/utils/serviceWorker');
    await registerServiceWorker();

    expect(consoleError).toHaveBeenCalledWith(
      'ServiceWorker registration failed:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});

describe('PWA Install Prompt', () => {
  let mockDeferredPrompt: any;

  beforeEach(() => {
    mockDeferredPrompt = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
      removeItem: jest.fn(),
      length: 0,
      key: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('should handle beforeinstallprompt event', () => {
    const preventDefault = jest.fn();
    const event = new Event('beforeinstallprompt');
    event.preventDefault = preventDefault;

    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('should not show prompt if recently dismissed', () => {
    const recentDismissTime = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days ago
    (localStorage.getItem as jest.Mock).mockReturnValue(recentDismissTime.toString());

    const shouldShow = PWAConfig.installPrompt.dismissCooldown > (Date.now() - recentDismissTime);
    expect(shouldShow).toBe(true);
  });

  it('should show prompt after cooldown period', () => {
    const oldDismissTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
    (localStorage.getItem as jest.Mock).mockReturnValue(oldDismissTime.toString());

    const shouldShow = PWAConfig.installPrompt.dismissCooldown < (Date.now() - oldDismissTime);
    expect(shouldShow).toBe(true);
  });
});