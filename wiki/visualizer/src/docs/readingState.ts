import { useSyncExternalStore } from 'react';

// 阅读进度与收藏：存在浏览器 localStorage，只在本机有效。
// Managed App 版本另有按登录用户隔离、跨设备同步的 App state，那部分依赖平台，这里不实现。
export interface ReadingState {
  scroll: number;
  lastReadAt: string;
  favorite: boolean;
}

export interface Snapshot {
  states: ReadonlyMap<string, ReadingState>;
}

const STORAGE_KEY = 'mf-reading:local';

function loadLocal(): Map<string, ReadingState> {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')));
  } catch {
    return new Map();
  }
}

let snapshot: Snapshot = { states: loadLocal() };
const listeners = new Set<() => void>();

export function updateReading(path: string, patch: Partial<ReadingState>) {
  const prev = snapshot.states.get(path) ?? { scroll: 0, lastReadAt: '', favorite: false };
  const states = new Map(snapshot.states);
  states.set(path, { ...prev, ...patch, lastReadAt: new Date().toISOString() });
  snapshot = { states };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(states)));
  } catch {
    // 隐私模式等情况下不可写，忽略
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReading(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
