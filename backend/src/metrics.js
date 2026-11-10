const client = require('prom-client');

// Initialize Prometheus registry
const register = new client.Registry();

// Add default system metrics (CPU, Memory, Event loop, Heap, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'fintrack_'
});

// Custom HTTP Metrics
const httpRequestDurationSeconds = new client.Histogram({
  name: 'fintrack_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'fintrack_http_requests_total',
  help: 'Total count of HTTP requests handled',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeRequestsGauge = new client.Gauge({
  name: 'fintrack_active_http_requests',
  help: 'Number of active HTTP requests currently being processed',
  registers: [register]
});

/**
 * Normalize express route paths to prevent high-cardinality metric labels
 * (e.g., replaces `/api/transactions/123` with `/api/transactions/:id`)
 */
const normalizeRoute = (req) => {
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }
  
  // Fallback regex cleanup for numeric IDs or UUIDs in URL
  let path = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || '/');
  path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
  path = path.replace(/\/\d+/g, '/:id');
  return path || '/';
};

/**
 * Express middleware to observe HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
  // Skip metrics route itself and static asset noise
  if (req.path === '/metrics' || req.path === '/favicon.ico') {
    return next();
  }

  activeRequestsGauge.inc();
  const start = process.hrtime();

  res.on('finish', () => {
    activeRequestsGauge.dec();
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = normalizeRoute(req);
    const statusCode = String(res.statusCode);
    const method = req.method;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationSeconds);
  });

  next();
};

/**
 * Export metrics for the Prometheus /metrics endpoint
 */
const getMetrics = async () => {
  return register.metrics();
};

const getContentType = () => {
  return register.contentType;
};

module.exports = {
  register,
  metricsMiddleware,
  getMetrics,
  getContentType,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  activeRequestsGauge
};
