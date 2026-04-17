// Base provider interface and implementation
export interface ProviderResult<T> {
  data: T;
  degraded: boolean;
  error?: string;
  source: string;
  timestamp: string;
}

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastChecked: string;
  responseTime?: number;
  error?: string;
}

export abstract class BaseProvider<T> {
  protected name: string;
  protected maxRetries: number;
  protected retryDelay: number;

  constructor(name: string, options: { maxRetries?: number; retryDelay?: number } = {}) {
    this.name = name;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abstract fetch(): Promise<T>;

  async fetchWithRetry(): Promise<ProviderResult<T>> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const data = await this.fetch();
        return {
          data,
          degraded: false,
          source: this.name,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // Return degraded response
    return {
      data: this.getDegradedData(),
      degraded: true,
      error: lastError,
      source: this.name,
      timestamp: new Date().toISOString(),
    };
  }

  abstract getDegradedData(): T;

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      await this.fetch();
      return {
        name: this.name,
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'unavailable',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
