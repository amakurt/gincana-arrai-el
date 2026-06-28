"use client";

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerProps {
  timerDuration: number;
  timerStartedAt: number | null;
  status: string;
  onTimeUp?: () => void;
}

export default function Timer({ timerDuration, timerStartedAt, status, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    if (status !== 'active' || !timerStartedAt || timerDuration <= 0) {
      setRemaining(null);
      setWarning(false);
      return;
    }

    const update = () => {
      const elapsed = (Date.now() - timerStartedAt) / 1000;
      const left = Math.max(0, timerDuration - elapsed);
      setRemaining(left);
      setWarning(left <= 10 && left > 0);
      if (left <= 0 && onTimeUp) onTimeUp();
    };

    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [timerDuration, timerStartedAt, status, onTimeUp]);

  if (remaining === null) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = remaining <= 30;
  const isExpired = remaining <= 0;

  if (isExpired) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1.2rem', borderRadius: '10px',
        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444', fontWeight: 800, fontSize: '1.1rem'
      }}>
        <AlertTriangle size={20} /> TEMPO ESGOTADO!
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.5rem 1rem', borderRadius: '10px',
      background: isUrgent ? 'rgba(239,68,68,0.12)' : warning ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.08)',
      border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : warning ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)'}`,
      color: isUrgent ? '#ef4444' : warning ? '#f59e0b' : '#10b981',
      fontFamily: 'monospace', fontWeight: 800, fontSize: isUrgent ? '1.3rem' : '1.1rem'
    }}>
      <Clock size={isUrgent ? 22 : 18} />
      {display}
    </div>
  );
}
