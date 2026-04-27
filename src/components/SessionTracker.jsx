import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  registerPlatformAccess,
  addPlatformTime,
  registerDashboardAccess,
  addDashboardTime,
} from "@infra/firebase";

const isPageActive = () => {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible" && document.hasFocus();
};

export default function SessionTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const uid = user?.uid || user?.id;

  const hasLogged = useRef(false);
  const platformInterval = useRef(null);
  const platformStart = useRef(null);
  const platformActivityTimeout = useRef(null);
  const platformLastActivity = useRef(Date.now());
  const dashboardActivityTimeout = useRef(null);
  const dashboardLastActivity = useRef(Date.now());
  const INACTIVITY_THRESHOLD_MS = 60000;

  useEffect(() => {
    if (uid && !hasLogged.current) {
      registerPlatformAccess(uid).catch(console.error);
      hasLogged.current = true;
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const flushPlatformTime = async () => {
      if (platformInterval.current) {
        clearInterval(platformInterval.current);
        platformInterval.current = null;
      }
      if (platformStart.current) {
        const elapsed = Math.round(
          (platformLastActivity.current - platformStart.current) / 1000,
        );
        if (elapsed > 0) {
          await addPlatformTime(uid, elapsed).catch(console.error);
        }
        platformStart.current = null;
      }
    };

    const resetPlatformInactivity = () => {
      platformLastActivity.current = Date.now();
      if (platformActivityTimeout.current) {
        clearTimeout(platformActivityTimeout.current);
      }
      platformActivityTimeout.current = window.setTimeout(() => {
        flushPlatformTime();
      }, INACTIVITY_THRESHOLD_MS);
    };

    const startPlatformTime = () => {
      if (platformInterval.current) return;
      platformStart.current = platformStart.current || Date.now();
      platformInterval.current = setInterval(() => {
        addPlatformTime(uid, 60).catch(console.error);
      }, 60000);
    };

    const handleVisibilityChange = () => {
      if (isPageActive()) {
        resetPlatformInactivity();
        startPlatformTime();
      } else {
        flushPlatformTime();
      }
    };

    const onPlatformActivity = () => {
      if (!isPageActive()) return;
      resetPlatformInactivity();
      startPlatformTime();
    };

    handleVisibilityChange();
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(
      (event) => window.addEventListener(event, onPlatformActivity),
    );

    return () => {
      flushPlatformTime();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
      ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(
        (event) => window.removeEventListener(event, onPlatformActivity),
      );
      if (platformActivityTimeout.current) {
        clearTimeout(platformActivityTimeout.current);
      }
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const path = location.pathname;
    const isDashboard =
      path.startsWith("/dashboard/") &&
      !path.includes("/edit") &&
      !path.includes("create");
    let dashId = null;
    let dashboardInterval = null;
    let dashboardStart = null;

    const stopDashboardTimer = async () => {
      if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
      }
      if (dashboardStart && dashId) {
        const elapsed = Math.round(
          (dashboardLastActivity.current - dashboardStart) / 1000,
        );
        if (elapsed > 0) {
          await addDashboardTime(uid, dashId, elapsed).catch(console.error);
        }
        dashboardStart = null;
      }
    };

    const resetDashboardInactivity = () => {
      dashboardLastActivity.current = Date.now();
      if (dashboardActivityTimeout.current) {
        clearTimeout(dashboardActivityTimeout.current);
      }
      dashboardActivityTimeout.current = window.setTimeout(() => {
        stopDashboardTimer();
      }, INACTIVITY_THRESHOLD_MS);
    };

    const startDashboardTimer = () => {
      if (!dashId || dashboardInterval) return;
      dashboardStart = dashboardStart || Date.now();
      dashboardInterval = setInterval(() => {
        addDashboardTime(uid, dashId, 60).catch(console.error);
      }, 60000);
    };

    const handleDashboardActivity = async () => {
      if (isDashboard && dashId && isPageActive()) {
        resetDashboardInactivity();
        startDashboardTimer();
      } else {
        await stopDashboardTimer();
      }
    };

    const onDashboardActivity = () => {
      if (!isDashboard || !dashId || !isPageActive()) return;
      resetDashboardInactivity();
      startDashboardTimer();
    };

    if (isDashboard) {
      dashId = path.split("/")[2];
      if (dashId) {
        registerDashboardAccess(uid, dashId).catch(console.error);
        handleDashboardActivity();
      }
    }

    window.addEventListener("visibilitychange", handleDashboardActivity);
    window.addEventListener("focus", handleDashboardActivity);
    window.addEventListener("blur", handleDashboardActivity);
    ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(
      (event) => window.addEventListener(event, onDashboardActivity),
    );

    return () => {
      stopDashboardTimer();
      window.removeEventListener("visibilitychange", handleDashboardActivity);
      window.removeEventListener("focus", handleDashboardActivity);
      window.removeEventListener("blur", handleDashboardActivity);
      ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach(
        (event) => window.removeEventListener(event, onDashboardActivity),
      );
      if (dashboardActivityTimeout.current) {
        clearTimeout(dashboardActivityTimeout.current);
      }
    };
  }, [location.pathname, uid]);

  return null;
}
