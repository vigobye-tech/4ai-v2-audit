// Enhanced error management and UX for AI chains

export interface ChainError {
  step: number;
  service: string;
  error: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ChainStatus {
  currentStep: number;
  totalSteps: number;
  isRunning: boolean;
  hasError: boolean;
  errors: ChainError[];
  results: string[];
  canRetry: boolean;
  canSkip: boolean;
}

export class ChainManager {
  private status: ChainStatus = {
    currentStep: 0,
    totalSteps: 0,
    isRunning: false,
    hasError: false,
    errors: [],
    results: [],
    canRetry: false,
    canSkip: false
  };

  private onStatusChange?: (status: ChainStatus) => void;

  constructor(onStatusChange?: (status: ChainStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  async runChain(services: string[], prompt: string): Promise<ChainStatus> {
    this.status = {
      currentStep: 0,
      totalSteps: services.length,
      isRunning: true,
      hasError: false,
      errors: [],
      results: [],
      canRetry: false,
      canSkip: false
    };

    this.notifyStatusChange();

    for (let i = 0; i < services.length; i++) {
      this.status.currentStep = i + 1;
      this.notifyStatusChange();

      try {
        const result = await this.executeStep(services[i], prompt, i);
        this.status.results.push(result);
        
        // Use result as input for next step
        prompt = result;
        
      } catch (error) {
        const chainError: ChainError = {
          step: i + 1,
          service: services[i],
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          recoverable: this.isRecoverableError(error)
        };

        this.status.errors.push(chainError);
        this.status.hasError = true;
        this.status.canRetry = chainError.recoverable;
        this.status.canSkip = i < services.length - 1; // Can skip if not last step
        this.status.isRunning = false;
        
        this.notifyStatusChange();
        
        // Wait for user decision
        const action = await this.waitForUserDecision();
        
        if (action === 'retry') {
          i--; // Retry current step
          this.status.canRetry = false;
          this.status.canSkip = false;
          this.status.isRunning = true;
          continue;
        } else if (action === 'skip') {
          this.status.canRetry = false;
          this.status.canSkip = false;
          this.status.isRunning = true;
          // Use previous result or original prompt
          prompt = this.status.results[this.status.results.length - 1] || prompt;
          continue;
        } else {
          // Stop chain
          break;
        }
      }
    }

    this.status.isRunning = false;
    this.notifyStatusChange();
    return this.status;
  }

  private async executeStep(service: string, prompt: string, stepIndex: number): Promise<string> {
    console.log(`[CHAIN] Step ${stepIndex + 1}: Executing on ${service}`);
    
    try {
      // Simulate different error types for testing
      if (service === 'test-timeout') {
        throw new Error('Request timeout after 30 seconds');
      }
      if (service === 'test-auth') {
        throw new Error('Authentication required - please log in to service');
      }
      if (service === 'test-network') {
        throw new Error('Network connection failed');
      }

      // Here would be the actual API call to the AI service
      const response = await window.__TAURI__.invoke('run_chain_step', {
        service,
        prompt,
        stepIndex
      }) as string;

      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from AI service');
      }

      return response;
      
    } catch (error) {
      console.error(`[CHAIN] Error in step ${stepIndex + 1} (${service}):`, error);
      throw error;
    }
  }

  private isRecoverableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Recoverable errors - user can retry
    const recoverablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'busy',
      'try again'
    ];

    return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private async waitForUserDecision(): Promise<'retry' | 'skip' | 'stop'> {
    return new Promise((resolve) => {
      // This would integrate with your UI to show error dialog
      // For now, simulate user decision
      setTimeout(() => {
        resolve('retry'); // Default to retry
      }, 1000);
    });
  }

  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status });
    }
  }

  getStatus(): ChainStatus {
    return { ...this.status };
  }

  retryCurrentStep(): void {
    if (this.status.canRetry && !this.status.isRunning) {
      // Trigger retry logic
      console.log('[CHAIN] Retrying current step');
    }
  }

  skipCurrentStep(): void {
    if (this.status.canSkip && !this.status.isRunning) {
      // Trigger skip logic
      console.log('[CHAIN] Skipping current step');
    }
  }

  stopChain(): void {
    this.status.isRunning = false;
    this.notifyStatusChange();
  }
}

// UI Helper functions
export function formatChainError(error: ChainError): string {
  const time = new Date(error.timestamp).toLocaleTimeString();
  return `Step ${error.step} (${error.service}) at ${time}: ${error.error}`;
}

export function getErrorSeverity(error: ChainError): 'warning' | 'error' | 'critical' {
  const message = error.error.toLowerCase();
  
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'critical';
  }
  if (message.includes('timeout') || message.includes('network')) {
    return 'warning';
  }
  return 'error';
}

export function suggestErrorFix(error: ChainError): string {
  const message = error.error.toLowerCase();
  
  if (message.includes('authentication') || message.includes('login')) {
    return 'Please log in to the AI service and try again.';
  }
  if (message.includes('timeout')) {
    return 'The request took too long. Try again or check your internet connection.';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'Check your internet connection and try again.';
  }
  if (message.includes('rate limit')) {
    return 'Wait a moment and try again. The service is temporarily limiting requests.';
  }
  if (message.includes('empty response')) {
    return 'The AI service returned an empty response. Try rephrasing your prompt.';
  }
  
  return 'An unexpected error occurred. Try again or skip this step.';
}