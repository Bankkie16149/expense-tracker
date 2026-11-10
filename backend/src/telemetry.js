// Fail-safe OpenTelemetry Telemetry Setup for Grafana Cloud
// MUST be required at the absolute top of src/index.js before other dependencies.

require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// Determine OTLP endpoint and authentication
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.GRAFANA_OTLP_ENDPOINT;
let authHeader = process.env.OTEL_EXPORTER_OTLP_HEADERS || process.env.GRAFANA_OTLP_HEADERS;

// If user provided instance ID and API token separately, build the Basic Auth header automatically
if (!authHeader && process.env.GRAFANA_INSTANCE_ID && process.env.GRAFANA_API_TOKEN) {
  const credentials = `${process.env.GRAFANA_INSTANCE_ID.trim()}:${process.env.GRAFANA_API_TOKEN.trim()}`;
  authHeader = `Authorization=Basic ${Buffer.from(credentials).toString('base64')}`;
}

const isTelemetryEnabled = Boolean(otlpEndpoint && (authHeader || process.env.OTEL_EXPORTER_OTLP_INSECURE === 'true'));

let sdk = null;

if (isTelemetryEnabled) {
  try {
    const serviceName = process.env.OTEL_SERVICE_NAME || 'fintrack-backend';
    const environment = process.env.NODE_ENV || 'production';

    // Parse headers if passed as string (e.g. "Authorization=Basic ...")
    const headers = {};
    if (authHeader) {
      authHeader.split(',').forEach((part) => {
        const [k, ...v] = part.split('=');
        if (k && v.length > 0) {
          headers[k.trim()] = v.join('=').trim();
        }
      });
    }

    const cleanEndpoint = otlpEndpoint.replace(/\/$/, '');
    const tracesUrl = cleanEndpoint.endsWith('/v1/traces') ? cleanEndpoint : `${cleanEndpoint}/v1/traces`;
    const metricsUrl = cleanEndpoint.endsWith('/v1/metrics') ? cleanEndpoint : `${cleanEndpoint}/v1/metrics`;

    const traceExporter = new OTLPTraceExporter({
      url: tracesUrl,
      headers
    });

    const metricExporter = new OTLPMetricExporter({
      url: metricsUrl,
      headers
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || '15000', 10)
    });

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME || 'service.name']: serviceName,
      [ATTR_SERVICE_VERSION || 'service.version']: '1.0.0',
      'deployment.environment': environment
    });

    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable filesystem instrumentation to prevent flooding trace quota
          '@opentelemetry/instrumentation-fs': { enabled: false }
        })
      ]
    });

    sdk.start();
    console.log(`[Telemetry] 🚀 OpenTelemetry initialized. Streaming metrics & traces to Grafana Cloud (${cleanEndpoint})`);

    // Graceful shutdown
    const gracefulShutdown = () => {
      sdk
        .shutdown()
        .then(() => console.log('[Telemetry] OpenTelemetry SDK terminated.'))
        .catch((err) => console.error('[Telemetry] Error shutting down OpenTelemetry:', err))
        .finally(() => process.exit(0));
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('[Telemetry] Failed to initialize OpenTelemetry SDK:', err.message);
  }
} else {
  console.log('[Telemetry] Grafana Cloud OTLP credentials not detected. Running without OpenTelemetry export.');
}

module.exports = {
  isTelemetryEnabled,
  sdk
};
