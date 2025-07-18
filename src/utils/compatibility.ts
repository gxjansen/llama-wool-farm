export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

export function checkAudioSupport(): boolean {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
}

export function checkTouchSupport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function checkStorageSupport(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export function checkIndexedDBSupport(): boolean {
  return 'indexedDB' in window;
}

export function checkServiceWorkerSupport(): boolean {
  return 'serviceWorker' in navigator;
}

export function checkNotificationSupport(): boolean {
  return 'Notification' in window;
}

export function getDeviceInfo(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  userAgent: string;
} {
  const userAgent = navigator.userAgent;
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const pixelRatio = window.devicePixelRatio || 1;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent) && screenWidth >= 768;
  const isDesktop = !isMobile;
  const hasTouch = checkTouchSupport();

  return {
    isMobile,
    isTablet,
    isDesktop,
    hasTouch,
    screenWidth,
    screenHeight,
    pixelRatio,
    userAgent,
  };
}

export function getBrowserInfo(): {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isOpera: boolean;
} {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isOpera = /OPR/.test(userAgent);

  if (isChrome) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (isFirefox) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (isSafari) {
    name = 'Safari';
    version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (isEdge) {
    name = 'Edge';
    version = userAgent.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
  } else if (isOpera) {
    name = 'Opera';
    version = userAgent.match(/OPR\/([0-9.]+)/)?.[1] || 'Unknown';
  }

  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isOpera,
  };
}

export function checkFullCompatibility(): {
  compatible: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!checkWebGLSupport()) {
    missing.push('WebGL');
  }
  if (!checkAudioSupport()) {
    missing.push('Web Audio');
  }
  if (!checkStorageSupport()) {
    missing.push('Local Storage');
  }
  if (!checkIndexedDBSupport()) {
    missing.push('IndexedDB');
  }

  return {
    compatible: missing.length === 0,
    missing,
  };
}