export interface HealthIndicatorDetails {
  status: 'up' | 'down';
  [key: string]: any;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, HealthIndicatorDetails>;
  error?: Record<string, HealthIndicatorDetails>;
  details?: Record<string, HealthIndicatorDetails>;
}
