"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useInterviewStore } from "../store/interviewStore";
import { formatTime, WARNING_THRESHOLD_SECONDS } from "../lib/constants";
import type { UseTimerReturn } from "../lib/types";

interface UseTimerOptions {
  durationMinutes: number;
  onExpire: () => void;
}

/**
 * Timer hook that integrates with the Zustand interview store.
 * Counts elapsed seconds, computes remaining time, and auto-expires.
 */
export function useTimer({
  durationMinutes,
  onExpire,
}: UseTimerOptions): UseTimerReturn {
  const elapsedSeconds = useInterviewStore((s) => s.elapsedSeconds);
  const timerRunning = useInterviewStore((s) => s.timerRunning);
  const tickTimer = useInterviewStore((s) => s.tickTimer);
  const pauseTimer = useInterviewStore((s) => s.pauseTimer);
  const resumeTimer = useInterviewStore((s) => s.resumeTimer);

  const onExpireRef = useRef(onExpire);

  // Keep onExpireRef in sync with latest callback
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const totalSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);
  const isExpired = remainingSeconds <= 0;
  const isWarning = !isExpired && remainingSeconds <= WARNING_THRESHOLD_SECONDS;
  const isRunning = timerRunning && !isExpired;
  const isPaused = !timerRunning && !isExpired;

  // Tick interval — runs every 1s when the timer is active
  useEffect(() => {
    if (!timerRunning || isExpired) return;

    const intervalId = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timerRunning, isExpired, tickTimer]);

  // Auto-expire — triggers onExpire and pauses when time runs out
  useEffect(() => {
    if (elapsedSeconds >= totalSeconds && timerRunning) {
      pauseTimer();
      onExpireRef.current();
    }
  }, [elapsedSeconds, totalSeconds, timerRunning, pauseTimer]);

  const pause = useCallback(() => {
    if (timerRunning && !isExpired) {
      pauseTimer();
    }
  }, [timerRunning, isExpired, pauseTimer]);

  const resume = useCallback(() => {
    if (!timerRunning && !isExpired) {
      resumeTimer();
    }
  }, [timerRunning, isExpired, resumeTimer]);

  return useMemo(
    () => ({
      elapsedSeconds,
      remainingSeconds,
      isRunning,
      isPaused,
      isWarning,
      isExpired,
      pause,
      resume,
      formatTime,
    }),
    [
      elapsedSeconds,
      remainingSeconds,
      isRunning,
      isPaused,
      isWarning,
      isExpired,
      pause,
      resume,
    ],
  );
}
