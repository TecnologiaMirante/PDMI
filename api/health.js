// Vercel serverless function — sistema PDMI
// Proxies para o backend Express e retorna saúde do sistema inteiro.

export default async function handler(_req, res) {
  const backendUrl = process.env.VITE_API_BASE_URL;

  if (!backendUrl) {
    return res.status(503).json({
      status: "unhealthy",
      version: "unknown",
      timestamp: new Date().toISOString(),
      checks: {
        backend: {
          status: "unhealthy",
          message: "VITE_API_BASE_URL não configurada",
        },
      },
    });
  }

  const t0 = Date.now();
  try {
    const upstream = await fetch(`${backendUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - t0;
    const body = await upstream.json();

    // Injeta o check de conectividade com o próprio backend
    const checks = {
      backend: {
        status: ms > 2000 ? "degraded" : "healthy",
        responseTimeMs: ms,
        ...(ms > 2000 ? { message: "Latência elevada com o backend" } : {}),
      },
      ...body.checks,
    };

    const statuses = Object.values(checks).map((c) => c.status);
    const globalStatus = statuses.includes("unhealthy")
      ? "unhealthy"
      : statuses.includes("degraded")
      ? "degraded"
      : "healthy";

    return res.status(globalStatus === "unhealthy" ? 503 : 200).json({
      status: globalStatus,
      version: body.version ?? "unknown",
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (err) {
    const ms = Date.now() - t0;
    const timedOut = err.name === "TimeoutError";
    return res.status(503).json({
      status: "unhealthy",
      version: "unknown",
      timestamp: new Date().toISOString(),
      checks: {
        backend: {
          status: "unhealthy",
          responseTimeMs: ms,
          message: timedOut ? "Timeout ao conectar com o backend" : err.message,
        },
      },
    });
  }
}
