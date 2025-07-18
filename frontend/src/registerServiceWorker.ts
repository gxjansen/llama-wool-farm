import { Workbox } from 'workbox-window';

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/service-worker.js');

    // Add event listeners
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker installed for the first time!');
        showUpdateNotification('Llama Wool Farm is ready to work offline!');
      }
    });

    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker activated for the first time!');
      }
    });

    wb.addEventListener('waiting', () => {
      showUpdatePrompt(wb);
    });

    // Note: 'externalwaiting' event doesn't exist in Workbox EventMap
    // Remove this event listener as it's not valid

    wb.addEventListener('message', (event) => {
      if (event.data.type === 'CACHE_UPDATED') {
        const { updatedURL } = event.data.payload;
        console.log(`A newer version of ${updatedURL} is available!`);
      }
    });

    // Register the service worker
    wb.register().catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  }
}

function showUpdatePrompt(wb: Workbox): void {
  // Create update UI
  const updateContainer = document.createElement('div');
  updateContainer.className = 'update-prompt';
  updateContainer.innerHTML = `
    <div class="update-prompt-content">
      <p>A new version of Llama Wool Farm is available!</p>
      <button id="update-button">Update</button>
      <button id="dismiss-button">Dismiss</button>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .update-prompt {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4A90E2;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    }
    
    .update-prompt-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .update-prompt button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    #update-button {
      background: white;
      color: #4A90E2;
    }
    
    #update-button:hover {
      background: #f0f0f0;
    }
    
    #dismiss-button {
      background: transparent;
      color: white;
      border: 1px solid white;
    }
    
    #dismiss-button:hover {
      background: rgba(255,255,255,0.1);
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(updateContainer);
  
  // Handle update button click
  document.getElementById('update-button')?.addEventListener('click', () => {
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
    
    // Skip waiting and activate the new service worker
    wb.messageSkipWaiting();
  });
  
  // Handle dismiss button click
  document.getElementById('dismiss-button')?.addEventListener('click', () => {
    updateContainer.remove();
  });
}

function showUpdateNotification(message: string): void {
  // Check if notifications are supported and permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Llama Wool Farm', {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'update-notification'
    });
  } else {
    // Fallback to console log
    console.log(message);
  }
}