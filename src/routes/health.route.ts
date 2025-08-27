// @ts-nocheck

import { Hono } from "hono";
import mongoose from "mongoose";

import { agenda } from "@/config/agenda";

const healthRouter = new Hono();

/**
 * GET /health
 * Comprehensive health check endpoint
 */
healthRouter.get("/health", async c => {
  const startTime = Date.now();
  const healthCheck: {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    services: any;
    system: any;
    responseTime?: string;
    error?: string;
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    services: {},
    system: {},
  };

  try {
    // Database Health Check
    let dbStatus = "unknown";
    let dbResponseTime = 0;
    let dbError = null;

    try {
      const dbStartTime = Date.now();
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        // Try a simple database operation
        await mongoose.connection.db.admin().ping();
        dbResponseTime = Date.now() - dbStartTime;
        dbStatus = "healthy";
      } else {
        dbStatus = "disconnected";
        dbError = "Database not connected or db instance not available";
      }
    } catch (error) {
      dbStatus = "unhealthy";
      dbError = error instanceof Error ? error.message : "Database error";
    }

    healthCheck.services.database = {
      status: dbStatus,
      responseTime: `${dbResponseTime}ms`,
      connectionState: mongoose.connection.readyState,
      ...(dbError && { error: dbError }),
    };

    // Agenda.js Health Check
    let agendaStatus = "unknown";
    let agendaStats = null;
    let agendaError = null;

    try {
      const agendaStartTime = Date.now();
      const [totalJobs, runningJobs, failedJobs] = await Promise.all([
        agenda.jobs({}).then(jobs => jobs.length),
        agenda.jobs({ lockedAt: { $exists: true } }).then(jobs => jobs.length),
        agenda.jobs({ failedAt: { $exists: true } }).then(jobs => jobs.length),
      ]);

      agendaStats = {
        totalJobs,
        runningJobs,
        failedJobs,
        responseTime: `${Date.now() - agendaStartTime}ms`,
      };
      agendaStatus = "healthy";
    } catch (error) {
      agendaStatus = "unhealthy";
      agendaError = error instanceof Error ? error.message : "Agenda error";
    }

    healthCheck.services.agenda = {
      status: agendaStatus,
      ...(agendaStats && { stats: agendaStats }),
      ...(agendaError && { error: agendaError }),
    };

    // System Information
    const memUsage = process.memoryUsage();
    healthCheck.system = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
    };

    // Overall Status Determination
    const serviceStatuses = Object.values(healthCheck.services).map(
      (service: any) => service.status
    );
    if (serviceStatuses.includes("unhealthy")) {
      healthCheck.status = "unhealthy";
    } else if (serviceStatuses.includes("unknown")) {
      healthCheck.status = "degraded";
    }

    const responseTime = Date.now() - startTime;
    healthCheck.responseTime = `${responseTime}ms`;

    const statusCode =
      healthCheck.status === "healthy" ? 200 : healthCheck.status === "degraded" ? 206 : 503;

    return c.json(healthCheck, statusCode);
  } catch (error) {
    healthCheck.status = "unhealthy";
    healthCheck.error = error instanceof Error ? error.message : "Health check failed";
    healthCheck.responseTime = `${Date.now() - startTime}ms`;

    return c.json(healthCheck, 503);
  }
});

export default healthRouter;
