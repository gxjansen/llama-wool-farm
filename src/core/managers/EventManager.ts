/**
 * Event manager for handling game-wide events
 */
export class EventManager {
  private events: Map<string, Set<Function>> = new Map();

  /**
   * Subscribe to an event
   */
  public on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: string, callback: Function): void {
    this.events.get(event)?.delete(callback);
  }

  /**
   * Emit an event
   */
  public emit(event: string, data?: any): void {
    this.events.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  public listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
}