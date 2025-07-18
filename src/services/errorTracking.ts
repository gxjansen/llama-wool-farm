/**
 * Error tracking service placeholder
 */
export class ErrorTrackingService {
  public static init(): void {
    // Initialize error tracking service
    console.log('Error tracking service initialized');
  }

  public static captureException(error: Error): void {
    // Capture and report errors
    console.error('Error captured:', error);
  }

  public static setContext(context: any): void {
    // Set error context
    console.log('Error context set:', context);
  }
}

/**
 * Report error - function export for dynamic imports
 */
export function reportError(error: Error): void {
  ErrorTrackingService.captureException(error);
}

export default ErrorTrackingService;