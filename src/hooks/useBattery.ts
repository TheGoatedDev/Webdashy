/**
 * useBattery - Battery Status API integration hook
 *
 * Monitors battery state if available. Shows toast on unplug during recording.
 * Falls back to assuming plugged-in if API not supported.
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface UseBatteryReturn {
  isPluggedIn: boolean;
  level: number | null;
  isSupported: boolean;
}

interface BatteryManager {
  charging: boolean;
  level: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }
}

export function useBattery(): UseBatteryReturn {
  const [isPluggedIn, setIsPluggedIn] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const { isRecording, addToast, setBatteryState } = useAppStore();

  useEffect(() => {
    // Check if Battery Status API is supported
    if (!navigator.getBattery) {
      console.log('[useBattery] Battery Status API not supported - assuming plugged in');
      setBatteryState(true, null);
      return;
    }

    setIsSupported(true);

    let battery: BatteryManager | null = null;
    let wasPluggedIn = true;

    const updateBatteryState = (charging: boolean, batteryLevel: number) => {
      setIsPluggedIn(charging);
      setLevel(batteryLevel);
      setBatteryState(charging, batteryLevel);

      // Toast on unplug during recording
      if (wasPluggedIn && !charging && isRecording) {
        addToast('Device unplugged', 'warning');
      }

      wasPluggedIn = charging;
    };

    const handleChargingChange = () => {
      if (battery) {
        updateBatteryState(battery.charging, battery.level);
      }
    };

    const handleLevelChange = () => {
      if (battery) {
        updateBatteryState(battery.charging, battery.level);
      }
    };

    // Initialize battery monitoring
    navigator.getBattery().then((batteryManager) => {
      battery = batteryManager;
      updateBatteryState(battery.charging, battery.level);

      // Listen for charging state changes
      battery.addEventListener('chargingchange', handleChargingChange);
      battery.addEventListener('levelchange', handleLevelChange);
    });

    // Cleanup on unmount
    return () => {
      if (battery) {
        battery.removeEventListener('chargingchange', handleChargingChange);
        battery.removeEventListener('levelchange', handleLevelChange);
      }
    };
  }, [isRecording, addToast, setBatteryState]);

  return {
    isPluggedIn,
    level,
    isSupported,
  };
}
