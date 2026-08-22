export type RuntimeTarget = 'web' | 'native';

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

export function detectRuntimeTarget(): RuntimeTarget {
  if (typeof window === 'undefined') {
    return 'web';
  }

  return window.Capacitor?.isNativePlatform?.() === true ? 'native' : 'web';
}

export const runtimeTarget = detectRuntimeTarget();

export function isNativeTarget(target: RuntimeTarget = runtimeTarget): boolean {
  return target === 'native';
}
