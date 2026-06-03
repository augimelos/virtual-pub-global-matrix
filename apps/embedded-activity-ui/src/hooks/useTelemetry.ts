import { useState, useEffect, useRef, useCallback } from 'react';

export interface DriverPosition {
  driver_number: number;
  position: number;
  driver_code: string;
  team: string;
  gap_to_leader: string;
  tire_compound: string;
  tire_age: number;
}

export function useTelemetry(active: boolean) {
  const [positions, setPositions] = useState<DriverPosition[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!active) return;
    try {
      const res = await fetch('https://api.openf1.org/v1/position?session_key=latest');
      if (!res.ok) throw new Error('API error');
      const data = (await res.json()) as Array<Record<string, unknown>>;

      const latest = new Map<number, Record<string, unknown>>();
      for (const d of data) latest.set(d['driver_number'] as number, d);

      const parsed = Array.from(latest.values())
        .map(d => ({
          driver_number: (d['driver_number'] as number) ?? 0,
          position: (d['position'] as number) ?? 0,
          driver_code: (d['driver_code'] as string) ?? '???',
          team: (d['team_name'] as string) ?? 'Unknown',
          gap_to_leader: (d['gap_to_leader'] as string) ?? '-',
          tire_compound: (d['compound'] as string) ?? 'Unknown',
          tire_age: (d['tire_age'] as number) ?? 0,
        }))
        .sort((a, b) => a.position - b.position);

      setPositions(parsed);
      setIsLive(parsed.length > 0);
      setLastUpdate(new Date());
    } catch {
      setIsLive(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      setPositions([]);
      setIsLive(false);
      return;
    }
    poll();
    ref.current = setInterval(poll, 5000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [active, poll]);

  return { positions, isLive, lastUpdate };
}
