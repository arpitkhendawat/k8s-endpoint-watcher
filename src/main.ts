#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Kubernetes EndpointSlice Watcher
 * Monitors endpoint changes and performs HTTP health checks
 */

import { parse } from "https://deno.land/std@0.208.0/flags/mod.ts";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Config {
  serviceName: string;
  namespace: string;
  appRoot: string;
  checkInterval: number; // seconds
  httpTimeout: number; // milliseconds
  logLevel: string;
  kubeApiServer: string;
  token: string;
}

function loadConfig(): Config {
  const serviceName = Deno.env.get("SERVICE_NAME");
  const namespace = Deno.env.get("NAMESPACE");
  const appRoot = Deno.env.get("APP_ROOT");

  if (!serviceName || !namespace || !appRoot) {
    console.error("❌ ERROR: SERVICE_NAME, NAMESPACE, and APP_ROOT are required");
    Deno.exit(1);
  }

  // Read Kubernetes service account token
  let token = "";
  let kubeApiServer = "";

  try {
    token = Deno.readTextFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token");
    kubeApiServer = Deno.env.get("KUBERNETES_SERVICE_HOST") || "kubernetes.default.svc";
    const port = Deno.env.get("KUBERNETES_SERVICE_PORT") || "443";
    kubeApiServer = `https://${kubeApiServer}:${port}`;
  } catch (e) {
    console.warn("⚠️  Warning: Could not read service account token. Running outside cluster?");
  }

  return {
    serviceName,
    namespace,
    appRoot,
    checkInterval: parseInt(Deno.env.get("CHECK_INTERVAL") || "5"),
    httpTimeout: parseInt(Deno.env.get("HTTP_TIMEOUT") || "5000"),
    logLevel: Deno.env.get("LOG_LEVEL") || "info",
    kubeApiServer,
    token,
  };
}

// ============================================================================
// LOGGING
// ============================================================================

function log(level: string, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] ${levelUpper}: ${message}`, ...args);
}

const logger = {
  info: (msg: string, ...args: any[]) => log("INFO", msg, ...args),
  warn: (msg: string, ...args: any[]) => log("WARN", msg, ...args),
  error: (msg: string, ...args: any[]) => log("ERROR", msg, ...args),
  debug: (msg: string, ...args: any[]) => log("DEBUG", msg, ...args),
};

// ============================================================================
// TYPES
// ============================================================================

interface Endpoint {
  addresses: string[];
  conditions?: {
    ready?: boolean;
  };
  targetRef?: {
    kind: string;
    name: string;
    namespace: string;
  };
  nodeName?: string;
}

interface EndpointSlice {
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
  };
  addressType: string;
  endpoints: Endpoint[];
  ports?: Array<{
    name?: string;
    port?: number;
    protocol?: string;
  }>;
}

interface WatchEvent {
  type: "ADDED" | "MODIFIED" | "DELETED" | "ERROR";
  object: EndpointSlice;
}

// ============================================================================
// KUBERNETES API CLIENT
// ============================================================================

class KubeClient {
  constructor(private config: Config) {}

  private async fetch(path: string, options: RequestInit = {}) {
    const url = `${this.config.kubeApiServer}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${this.config.token}`);

    return await fetch(url, {
      ...options,
      headers,
      // Skip TLS verification for in-cluster communication
      // @ts-ignore - Deno specific
      client: { tlsSkipVerify: true },
    });
  }

  async *watchEndpointSlices(): AsyncGenerator<WatchEvent> {
    const { serviceName, namespace } = this.config;
    const labelSelector = `kubernetes.io/service-name=${serviceName}`;
    const path = `/apis/discovery.k8s.io/v1/namespaces/${namespace}/endpointslices?watch=true&labelSelector=${encodeURIComponent(labelSelector)}`;

    logger.info(`🔍 Watching EndpointSlices for service: ${serviceName} in namespace: ${namespace}`);

    while (true) {
      try {
        const response = await this.fetch(path);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event: WatchEvent = JSON.parse(line);
                yield event;
              } catch (e) {
                logger.error(`Failed to parse watch event: ${e.message}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Watch error: ${error.message}`);
        logger.info("Reconnecting in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

// ============================================================================
// HEALTH CHECKER
// ============================================================================

class HealthChecker {
  private healthUrl: string;

  constructor(private config: Config) {
    // Build health check URL: http://service.namespace.svc.cluster.local/appRoot/api/p/health
    this.healthUrl = `http://${config.serviceName}.${config.namespace}.svc.cluster.local/${config.appRoot}/api/p/health`;
  }

  async check(): Promise<{ success: boolean; duration: number; status?: number; error?: string }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);

    try {
      const response = await fetch(this.healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      return {
        success: response.ok,
        duration,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (error.name === "AbortError") {
        return {
          success: false,
          duration,
          error: `TIMEOUT after ${this.config.httpTimeout}ms`,
        };
      }

      return {
        success: false,
        duration,
        error: error.message,
      };
    }
  }

  getUrl(): string {
    return this.healthUrl;
  }
}

// ============================================================================
// ENDPOINT TRACKER
// ============================================================================

interface EndpointInfo {
  ip: string;
  port?: number;
  podName?: string;
  nodeName?: string;
  ready: boolean;
}

class EndpointTracker {
  private endpoints: Map<string, EndpointInfo> = new Map();

  update(endpointSlice: EndpointSlice) {
    const newEndpoints = new Map<string, EndpointInfo>();

    for (const endpoint of endpointSlice.endpoints) {
      const ready = endpoint.conditions?.ready ?? false;
      const port = endpointSlice.ports?.[0]?.port;

      for (const address of endpoint.addresses) {
        const key = `${address}:${port || ""}`;
        newEndpoints.set(key, {
          ip: address,
          port,
          podName: endpoint.targetRef?.name,
          nodeName: endpoint.nodeName,
          ready,
        });
      }
    }

    // Detect changes
    const added: EndpointInfo[] = [];
    const removed: EndpointInfo[] = [];

    // Find added endpoints
    for (const [key, info] of newEndpoints) {
      if (!this.endpoints.has(key)) {
        added.push(info);
      }
    }

    // Find removed endpoints
    for (const [key, info] of this.endpoints) {
      if (!newEndpoints.has(key)) {
        removed.push(info);
      }
    }

    this.endpoints = newEndpoints;

    return { added, removed, current: Array.from(this.endpoints.values()) };
  }

  getEndpoints(): EndpointInfo[] {
    return Array.from(this.endpoints.values());
  }

  getReadyCount(): number {
    return Array.from(this.endpoints.values()).filter(e => e.ready).length;
  }

  getNotReadyCount(): number {
    return Array.from(this.endpoints.values()).filter(e => !e.ready).length;
  }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

async function main() {
  const config = loadConfig();

  // Print startup banner
  logger.info("🚀 Starting K8s Endpoint Watcher");
  logger.info("📋 Configuration:");
  logger.info(`  Service: ${config.serviceName}`);
  logger.info(`  Namespace: ${config.namespace}`);
  logger.info(`  App Root: ${config.appRoot}`);
  logger.info(`  Check Interval: ${config.checkInterval}s`);
  logger.info(`  HTTP Timeout: ${config.httpTimeout}ms`);
  logger.info("");

  const kubeClient = new KubeClient(config);
  const healthChecker = new HealthChecker(config);
  const tracker = new EndpointTracker();

  logger.info(`🏥 Health Check URL: ${healthChecker.getUrl()}`);
  logger.info("");

  // Start periodic health checks
  const healthCheckInterval = setInterval(async () => {
    const result = await healthChecker.check();

    if (result.success) {
      logger.info(`🔗 HTTP Health Check`);
      logger.info(`  ✅ SUCCESS - ${result.duration}ms - Status: ${result.status}`);
    } else {
      logger.warn(`🔗 HTTP Health Check`);
      logger.warn(`  ❌ FAILED - ${result.error}`);
      logger.warn(`  📊 Active endpoints: ${tracker.getReadyCount()} ready, ${tracker.getNotReadyCount()} not-ready`);
    }
  }, config.checkInterval * 1000);

  // Watch EndpointSlice changes
  let isFirstEvent = true;

  for await (const event of kubeClient.watchEndpointSlices()) {
    if (event.type === "ERROR") {
      logger.error(`Watch error event: ${JSON.stringify(event.object)}`);
      continue;
    }

    const changes = tracker.update(event.object);

    if (isFirstEvent && event.type === "ADDED") {
      logger.info(`✅ Initial endpoints discovered: ${tracker.getReadyCount()} ready`);
      for (const ep of changes.current.filter(e => e.ready)) {
        logger.info(`  • ${ep.ip}${ep.port ? ':' + ep.port : ''} → pod: ${ep.podName || 'unknown'} (node: ${ep.nodeName || 'unknown'})`);
      }
      logger.info("");
      isFirstEvent = false;

      // Do immediate health check
      const result = await healthChecker.check();
      if (result.success) {
        logger.info(`🔗 Initial HTTP Health Check`);
        logger.info(`  ✅ SUCCESS - ${result.duration}ms - Status: ${result.status}`);
        logger.info("");
      }
      continue;
    }

    if (changes.added.length > 0 || changes.removed.length > 0) {
      logger.info(`🔄 EndpointSlice ${event.type}`);

      for (const ep of changes.added) {
        const status = ep.ready ? "✅ READY" : "⏳ NOT READY";
        logger.info(`  ➕ ADDED: ${ep.ip}${ep.port ? ':' + ep.port : ''} → pod: ${ep.podName || 'unknown'} (node: ${ep.nodeName || 'unknown'}) [${status}]`);
      }

      for (const ep of changes.removed) {
        logger.info(`  ➖ REMOVED: ${ep.ip}${ep.port ? ':' + ep.port : ''} → pod: ${ep.podName || 'unknown'} (node: ${ep.nodeName || 'unknown'})`);
      }

      logger.info(`  📊 Ready endpoints: ${tracker.getReadyCount()}`);
      logger.info("");

      // Trigger immediate health check on endpoint changes
      logger.info(`🔗 HTTP Health Check (triggered by endpoint change)`);
      const result = await healthChecker.check();
      if (result.success) {
        logger.info(`  ✅ SUCCESS - ${result.duration}ms - Status: ${result.status}`);
      } else {
        logger.warn(`  ❌ FAILED - ${result.error}`);
      }
      logger.info("");
    }
  }

  clearInterval(healthCheckInterval);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (import.meta.main) {
  main().catch((error) => {
    logger.error(`Fatal error: ${error.message}`);
    logger.error(error.stack);
    Deno.exit(1);
  });
}

// ============================================================================
// HEALTH CHECKER
// ============================================================================

