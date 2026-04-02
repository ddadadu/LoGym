import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'logym_stopwatch_state';

export default function useStopwatch() {
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  
  const startTimeRef = useRef(null);
  const accumTimeRef = useRef(0);
  const requestRef = useRef();

  // 1. 초기 로드 시 브라우저 로컬스토리지에서 시간 복원
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.isRunning && parsed.lastStartTime) {
          // 백그라운드에 있던 시간(현재 - 마지막 저장된 시작시간)만큼 누적 보정
          const now = Date.now();
          const diff = now - parsed.lastStartTime;
          accumTimeRef.current = parsed.accumulatedTime + diff;
          setElapsedTimeMs(accumTimeRef.current);
          startTimeRef.current = now;
          setIsRunning(true);
        } else {
          accumTimeRef.current = parsed.accumulatedTime || 0;
          setElapsedTimeMs(accumTimeRef.current);
          setIsRunning(false);
        }
      } catch (e) {
        console.error('Invalid stopwatch state in local storage', e);
      }
    }
  }, []);

  // requestAnimationFrame을 활용한 고정밀 타이머
  const update = () => {
    if (startTimeRef.current !== null) {
      const now = Date.now();
      const diff = now - startTimeRef.current;
      setElapsedTimeMs(accumTimeRef.current + diff);
      requestRef.current = requestAnimationFrame(update);
    }
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(update);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning]);

  // 상태를 로컬스토리지에 주입하는 헬퍼 함수
  const saveState = (running, accum) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isRunning: running,
        accumulatedTime: accum,
        lastStartTime: running ? Date.now() : null,
      })
    );
  };

  const start = () => {
    if (!isRunning) {
      setIsRunning(true);
      saveState(true, accumTimeRef.current);
    }
  };

  const pause = () => {
    if (isRunning) {
      setIsRunning(false);
      if (startTimeRef.current !== null) {
        accumTimeRef.current += Date.now() - startTimeRef.current;
        setElapsedTimeMs(accumTimeRef.current);
      }
      saveState(false, accumTimeRef.current);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedTimeMs(0);
    accumTimeRef.current = 0;
    startTimeRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  // 기존 초단위 -> 분:초:밀리세컨드(10ms단위) 포맷 변환
  const formatTime = (totalMs) => {
    const totalSeconds = Math.floor(totalMs / 1000);
    const ms = Math.floor((totalMs % 1000) / 10); // 1/100th of a second
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}:${pad(ms)}`;
  };

  return {
    elapsedTime: Math.floor(elapsedTimeMs / 1000), // DB 저장용(초)
    formattedTime: formatTime(elapsedTimeMs),
    isRunning,
    start,
    pause,
    reset,
  };
}
