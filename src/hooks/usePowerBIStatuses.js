import { useState, useEffect } from "react";
import {
  getPowerBIToken,
  getAllDatasets,
  getDatasetRefreshStatus,
  getDatasetRefreshSchedule,
} from "@/services/powerbi";

/**
 * Busca o status de atualização do Power BI para cada dashboard,
 * comparando o título do dashboard com o nome do dataset no Power BI.
 *
 * @param {Array} dashboards - Lista de dashboards do Firestore
 * @returns {Object} statusMap — { [titulo]: { status, lastRefresh, nextRefresh } }
 */
export function usePowerBIStatuses(dashboards) {
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    if (dashboards.length === 0) return;

    // Marca todos como loading imediatamente
    setStatusMap(() => {
      const next = {};
      dashboards.forEach((d) => {
        next[d.titulo] = { status: "loading", lastRefresh: null };
      });
      return next;
    });

    async function fetchAll() {
      let token;
      try {
        token = await getPowerBIToken();
      } catch (err) {
        setStatusMap(() => {
          const next = {};
          dashboards.forEach((d) => {
            next[d.titulo] = { status: "error", lastRefresh: null };
          });
          return next;
        });
        return;
      }

      // Busca todos os datasets e monta mapa { nome → { id, refreshed } }
      let datasetsByName = {};
      try {
        datasetsByName = await getAllDatasets(token);
      } catch (err) {
        setStatusMap(() => {
          const next = {};
          dashboards.forEach((d) => {
            next[d.titulo] = { status: "error", lastRefresh: null };
          });
          return next;
        });
        return;
      }

      // Para cada dashboard, tenta encontrar o dataset pelo título
      await Promise.allSettled(
        dashboards.map(async (dash) => {
          const datasetInfo = datasetsByName[dash.titulo];

          if (!datasetInfo) {
            setStatusMap((prev) => ({
              ...prev,
              [dash.titulo]: { status: null, lastRefresh: null },
            }));
            return;
          }

          const { id: datasetId, refreshed: datasetRefreshed } = datasetInfo;

          try {
            const [refreshData, scheduleData] = await Promise.all([
              getDatasetRefreshStatus(token, datasetId),
              getDatasetRefreshSchedule(token, datasetId).catch(() => ({
                nextRefresh: null,
              })),
            ]);

            const { status, lastRefresh } = refreshData;
            const { nextRefresh } = scheduleData;

            // Quando o histórico de refreshes está vazio (dataset nunca foi
            // atualizado via agendador — apenas publicado via Desktop),
            // usa a data de publicação do dataset como fallback.
            const effectiveLastRefresh = lastRefresh ?? datasetRefreshed;
            const effectiveStatus =
              status === "unknown" && effectiveLastRefresh ? "updated" : status;

            let adjustedStatus = effectiveStatus;

            if (effectiveStatus === "updated" && effectiveLastRefresh) {
              const isRecent =
                Date.now() - new Date(effectiveLastRefresh).getTime() <
                24 * 60 * 60 * 1000;

              if (nextRefresh === null) {
                // Sem agendamento: sempre atualizado
                adjustedStatus = "updated";
              } else {
                adjustedStatus = isRecent ? "updated" : "outdated";
              }
            } else if (effectiveStatus === "outdated" && effectiveLastRefresh) {
              const isRecent =
                Date.now() - new Date(effectiveLastRefresh).getTime() <
                24 * 60 * 60 * 1000;
              adjustedStatus = isRecent ? "updated" : "outdated";
            }

            setStatusMap((prev) => ({
              ...prev,
              [dash.titulo]: {
                status: adjustedStatus,
                lastRefresh: effectiveLastRefresh,
                nextRefresh,
              },
            }));
          } catch (err) {
            setStatusMap((prev) => ({
              ...prev,
              [dash.titulo]: {
                status: "error",
                lastRefresh: null,
                nextRefresh: null,
              },
            }));
          }
        }),
      );
    }

    fetchAll();
  }, [dashboards]);

  return statusMap;
}
