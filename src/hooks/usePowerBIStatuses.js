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
 * @returns {Object} statusMap — { [titulo]: "loading"|"updated"|"outdated"|"unknown"|"error" }
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

      // Busca todos os datasets e monta mapa { nome → id }
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
          const datasetId = datasetsByName[dash.titulo];

          if (!datasetId) {
            setStatusMap((prev) => ({
              ...prev,
              [dash.titulo]: { status: null, lastRefresh: null },
            }));
            return;
          }

          try {
            const [refreshData, scheduleData] = await Promise.all([
              getDatasetRefreshStatus(token, datasetId),
              getDatasetRefreshSchedule(token, datasetId).catch(() => ({
                nextRefresh: null,
              })),
            ]);

            // Ajustar status baseado nas regras
            let adjustedStatus = refreshData.status;
            const { status, lastRefresh } = refreshData;
            const { nextRefresh } = scheduleData;

            if (status === "updated" && lastRefresh) {
              // Último refresh foi "Completed" (já que status=updated na função)
              const isRecent =
                Date.now() - new Date(lastRefresh).getTime() <
                24 * 60 * 60 * 1000;

              if (nextRefresh === null) {
                // Não tem schedule: sempre updated
                adjustedStatus = "updated";
              } else {
                // Tem schedule: updated se recent, outdated se não
                adjustedStatus = isRecent ? "updated" : "outdated";
              }
            } else if (status === "outdated" && lastRefresh) {
              // Último refresh falhou: manter lógica de recência
              const isRecent =
                Date.now() - new Date(lastRefresh).getTime() <
                24 * 60 * 60 * 1000;
              adjustedStatus = isRecent ? "updated" : "outdated";
            }

            setStatusMap((prev) => ({
              ...prev,
              [dash.titulo]: {
                status: adjustedStatus,
                lastRefresh,
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
