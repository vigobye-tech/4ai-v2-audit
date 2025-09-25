/**
 * WebView Pool Manager - Implementacja sugestii Manusa
 * 
 * Zamiast tworzyć nowy WebView dla każdej interakcji,
 * utrzymujemy pulę WebView'ów dla większej wydajności
 */

import * as ipc from './ipc';
import { logger } from './logger';
import type { AiServiceId } from './types';

interface PooledWebView {
  label: string;
  serviceId: AiServiceId;
  url: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
  isInitialized: boolean;
}

interface WebViewPoolOptions {
  maxPoolSize: number;
  maxIdleTime: number; // milliseconds
  preloadServices: AiServiceId[];
}

class WebViewPoolManager {
  private pool: Map<string, PooledWebView> = new Map();
  private options: WebViewPoolOptions;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<WebViewPoolOptions> = {}) {
    this.options = {
      maxPoolSize: 3, // Max 3 WebViews in pool (memory efficient)
      maxIdleTime: 5 * 60 * 1000, // 5 minutes idle time
      preloadServices: ['claude', 'chatgpt'], // Preload most used services
      ...options
    };

    this.startCleanupTimer();
    this.preloadWebViews();
  }

  /**
   * Get or create a WebView for the specified service
   * Implements Manus's suggestion for persistent connections
   */
  async getWebView(serviceId: AiServiceId, url: string): Promise<string> {
    const existingWebView = this.findWebViewForService(serviceId);
    
    if (existingWebView && existingWebView.isInitialized) {
      existingWebView.lastUsed = Date.now();
      existingWebView.isActive = true;
      
      logger.info('webviewPool', 'Reusing existing WebView', { 
        serviceId, 
        label: existingWebView.label,
        age: Date.now() - existingWebView.createdAt
      });
      
      return existingWebView.label;
    }

    // Create new WebView if pool has space or replace oldest inactive one
    if (this.pool.size >= this.options.maxPoolSize) {
      await this.evictOldestWebView();
    }

    const label = `ai-${serviceId}-pooled-${Date.now()}`;
    const webView: PooledWebView = {
      label,
      serviceId,
      url,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: true,
      isInitialized: false
    };

    try {
      await ipc.createWebview(label, url);
      webView.isInitialized = true;
      this.pool.set(label, webView);

      logger.info('webviewPool', 'Created new pooled WebView', { 
        serviceId, 
        label,
        poolSize: this.pool.size
      });

      return label;
    } catch (error) {
      logger.error('webviewPool', 'Failed to create WebView', { serviceId, error: String(error) });
      throw error;
    }
  }

  /**
   * Release WebView back to pool (don't close it immediately)
   */
  async releaseWebView(label: string): Promise<void> {
    const webView = this.pool.get(label);
    if (webView) {
      webView.isActive = false;
      webView.lastUsed = Date.now();
      
      logger.info('webviewPool', 'WebView released to pool', { 
        label,
        serviceId: webView.serviceId
      });
    }
  }

  /**
   * Force close and remove WebView from pool
   */
  async closeWebView(label: string): Promise<void> {
    const webView = this.pool.get(label);
    if (webView) {
      try {
        await ipc.closeWebview(label);
        this.pool.delete(label);
        
        logger.info('webviewPool', 'WebView closed and removed from pool', { 
          label,
          serviceId: webView.serviceId
        });
      } catch (error) {
        logger.warn('webviewPool', 'Failed to close WebView', { 
          label, 
          error: String(error) 
        });
        // Remove from pool anyway
        this.pool.delete(label);
      }
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    const stats = {
      totalWebViews: this.pool.size,
      activeWebViews: 0,
      idleWebViews: 0,
      serviceBreakdown: {} as Record<AiServiceId, number>
    };

    for (const webView of this.pool.values()) {
      if (webView.isActive) {
        stats.activeWebViews++;
      } else {
        stats.idleWebViews++;
      }

      stats.serviceBreakdown[webView.serviceId] = 
        (stats.serviceBreakdown[webView.serviceId] || 0) + 1;
    }

    return stats;
  }

  private findWebViewForService(serviceId: AiServiceId): PooledWebView | null {
    for (const webView of this.pool.values()) {
      if (webView.serviceId === serviceId && !webView.isActive) {
        return webView;
      }
    }
    return null;
  }

  private async evictOldestWebView(): Promise<void> {
    let oldestWebView: PooledWebView | null = null;
    let oldestTime = Date.now();

    // Find oldest inactive WebView
    for (const webView of this.pool.values()) {
      if (!webView.isActive && webView.lastUsed < oldestTime) {
        oldestTime = webView.lastUsed;
        oldestWebView = webView;
      }
    }

    if (oldestWebView) {
      await this.closeWebView(oldestWebView.label);
      logger.info('webviewPool', 'Evicted oldest WebView from pool', { 
        serviceId: oldestWebView.serviceId,
        age: Date.now() - oldestWebView.createdAt
      });
    }
  }

  private async preloadWebViews(): Promise<void> {
    // Preload commonly used services for better performance
    for (const serviceId of this.options.preloadServices) {
      try {
        // We'll need to get the URL from aiServices
        // This is a simplified version - in real implementation,
        // we'd get the URL from the service configuration
        const urls = {
          claude: 'https://claude.ai',
          chatgpt: 'https://chat.openai.com',
          gemini: 'https://gemini.google.com',
          copilot: 'https://github.com/copilot'
        };

        if (urls[serviceId]) {
          setTimeout(async () => {
            try {
              const label = await this.getWebView(serviceId, urls[serviceId]);
              await this.releaseWebView(label);
              logger.info('webviewPool', 'Preloaded WebView', { serviceId });
            } catch (error) {
              logger.warn('webviewPool', 'Failed to preload WebView', { 
                serviceId, 
                error: String(error) 
              });
            }
          }, 1000 * (this.options.preloadServices.indexOf(serviceId) + 1)); // Stagger preloading
        }
      } catch (error) {
        logger.warn('webviewPool', 'Preload failed', { serviceId, error: String(error) });
      }
    }
  }

  private startCleanupTimer(): void {
    // Clean up idle WebViews every minute
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const toRemove: string[] = [];

      for (const [label, webView] of this.pool.entries()) {
        if (!webView.isActive && (now - webView.lastUsed) > this.options.maxIdleTime) {
          toRemove.push(label);
        }
      }

      for (const label of toRemove) {
        await this.closeWebView(label);
        logger.info('webviewPool', 'Cleaned up idle WebView', { label });
      }
    }, 60000); // Run every minute
  }

  /**
   * Cleanup all WebViews and stop cleanup timer
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const labels = Array.from(this.pool.keys());
    for (const label of labels) {
      await this.closeWebView(label);
    }

    logger.info('webviewPool', 'WebView pool destroyed', { 
      closedWebViews: labels.length 
    });
  }
}

// Global pool instance (Singleton pattern)
export const webViewPool = new WebViewPoolManager();

// Export for testing and advanced usage
export { WebViewPoolManager };
export type { PooledWebView, WebViewPoolOptions };