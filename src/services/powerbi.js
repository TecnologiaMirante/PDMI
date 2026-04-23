const PROXY_URL = import.meta.env.VITE_PBI_PROXY_URL;
const CLIENT_ID = import.meta.env.VITE_PBI_CLIENT_ID;
const USERNAME = import.meta.env.VITE_PBI_USERNAME;
const PASSWORD = import.meta.env.VITE_PBI_PASSWORD;
const CLIENT_SECRET = import.meta.env.VITE_PBI_CLIENT_SECRET;
const PBI_API = "https://api.powerbi.com/v1.0/myorg";

const DATASETS_TTL  = 5 * 60 * 1000;   // 5 min — lista de datasets muda raramente
const REFRESH_TTL   = 3 * 60 * 1000;   // 3 min — status de refresh
const SCHEDULE_TTL  = 10 * 60 * 1000;  // 10 min — schedule muda muito raramente

// ── Cache do token ────────────────────────────────────────────
let _token = null;
let _tokenExpiry = 0;

// ── Cache de datasets { name → id } ──────────────────────────
let _datasetsCache = null;
let _datasetsExpiry = 0;
// Promise em voo para evitar chamadas duplicadas simultâneas
let _datasetsInflight = null;

// ── Cache de refresh por datasetId ────────────────────────────
const _refreshCache = new Map();   // datasetId → { data, expiry }
const _scheduleCache = new Map();  // datasetId → { data, expiry }

export async function getPowerBIToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const body = new URLSearchParams({
    grant_type: "password",
    scope: "https://analysis.windows.net/powerbi/api/.default",
    client_id: CLIENT_ID,
    username: USERNAME,
    password: PASSWORD,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Falha ao obter token Power BI: ${res.status}`);

  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 120) * 1000;
  return _token;
}

/**
 * Retorna todos os datasets de TODOS os workspaces como { [name]: id }.
 * Resultado fica em cache por 5 minutos; chamadas simultâneas compartilham
 * a mesma Promise em voo (sem duplicar requests).
 */
export async function getAllDatasets(accessToken) {
  if (_datasetsCache && Date.now() < _datasetsExpiry) return _datasetsCache;
  if (_datasetsInflight) return _datasetsInflight;

  _datasetsInflight = (async () => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const map = {};

    // "Meu workspace" + grupos em paralelo
    const [myRes, groupsRes] = await Promise.all([
      fetch(`${PBI_API}/datasets`, { headers }),
      fetch(`${PBI_API}/groups`, { headers }),
    ]);

    if (myRes.ok) {
      const { value = [] } = await myRes.json();
      for (const ds of value) if (ds.name && ds.id) map[ds.name] = ds.id;
    }

    if (groupsRes.ok) {
      const { value: groups = [] } = await groupsRes.json();
      await Promise.allSettled(
        groups.map(async (g) => {
          const r = await fetch(`${PBI_API}/groups/${g.id}/datasets`, { headers });
          if (!r.ok) return;
          const { value = [] } = await r.json();
          for (const ds of value) if (ds.name && ds.id) map[ds.name] = ds.id;
        })
      );
    }

    _datasetsCache  = map;
    _datasetsExpiry = Date.now() + DATASETS_TTL;
    _datasetsInflight = null;
    return map;
  })();

  return _datasetsInflight;
}

/**
 * Retorna o status do último refresh de um dataset e a data do último refresh.
 * Resultado fica em cache por 3 minutos.
 * @returns {{status: "updated" | "outdated" | "unknown", lastRefresh: string|null }}
 */
export async function getDatasetRefreshStatus(accessToken, datasetId) {
  const cached = _refreshCache.get(datasetId);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const res = await fetch(
    `${PBI_API}/datasets/${datasetId}/refreshes?$top=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error(`Erro refresh API: ${res.status}`);

  const { value: refreshes = [] } = await res.json();
  const status = refreshes.length === 0
    ? "unknown"
    : refreshes[0].status === "Completed" ? "updated" : "outdated";
    
  const lastRefresh = refreshes.length > 0 && refreshes[0].endTime ? refreshes[0].endTime : null;
  const data = { status, lastRefresh };

  _refreshCache.set(datasetId, { data, expiry: Date.now() + REFRESH_TTL });
  return data;
}

// Mapa de dias em inglês → índice JS (0 = domingo)
const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

/**
 * Calcula o próximo horário agendado de refresh de um dataset.
 * @returns {{ nextRefresh: string|null }} ISO string do próximo refresh, ou null se não houver schedule.
 */
export async function getDatasetRefreshSchedule(accessToken, datasetId) {
  const cached = _scheduleCache.get(datasetId);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const res = await fetch(
    `${PBI_API}/datasets/${datasetId}/refreshSchedule`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const data = { nextRefresh: null };
    _scheduleCache.set(datasetId, { data, expiry: Date.now() + SCHEDULE_TTL });
    return data;
  }

  const schedule = await res.json();

  let nextRefresh = null;
  if (schedule.enabled && schedule.days?.length && schedule.times?.length) {
    const tz = schedule.localTimeZoneId || "UTC";
    // Data/hora atual no timezone do dataset
    const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const todayIdx = nowInTz.getDay();
    const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();

    const scheduledDayIdxs = schedule.days.map((d) => DAY_INDEX[d]).filter((d) => d !== undefined);
    const scheduledMinutes = schedule.times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    }).sort((a, b) => a - b);

    // Itera os próximos 7 dias para encontrar o próximo slot
    for (let offset = 0; offset < 7; offset++) {
      const dayIdx = (todayIdx + offset) % 7;
      if (!scheduledDayIdxs.includes(dayIdx)) continue;

      for (const mins of scheduledMinutes) {
        if (offset > 0 || mins > currentMinutes) {
          const candidate = new Date(nowInTz);
          candidate.setDate(candidate.getDate() + offset);
          candidate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
          nextRefresh = candidate.toISOString();
          break;
        }
      }
      if (nextRefresh) break;
    }
  }

  const data = { nextRefresh };
  _scheduleCache.set(datasetId, { data, expiry: Date.now() + SCHEDULE_TTL });
  return data;
}
