import React, { useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { PrayerRequest } from '../types';

interface ReminderListenerProps {
  userId: string;
}

export const ReminderListener: React.FC<ReminderListenerProps> = ({ userId }) => {
  useEffect(() => {
    if (!userId) return;

    // Request Notification permission on mount
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    let unsubscribe = () => {};

    const setupListeners = () => {
      // Setup Guest Mode Listener (Local Storage polling)
      if (userId === 'guest-dev-user') {
        const checkLocalReminders = () => {
          const local = localStorage.getItem('lumen_prayers');
          if (local) {
            const prayers: PrayerRequest[] = JSON.parse(local);
            checkAndNotify(prayers);
          }
        };
        
        // Check immediately and every minute
        checkLocalReminders();
        const interval = setInterval(checkLocalReminders, 60000);
        unsubscribe = () => clearInterval(interval);
      } 
      // Setup Firebase Listener
      else if (db) {
        // Query prayers that haven't been answered (assuming we don't remind for answered ones, or just all)
        const q = query(collection(db, 'users', userId, 'prayers'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const prayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest));
          checkAndNotify(prayers);
        });
      }
    };

    const notifiedIds = new Set<string>();

    const checkAndNotify = (prayers: PrayerRequest[]) => {
      const now = Date.now();
      
      prayers.forEach(prayer => {
        if (prayer.reminderTime && !prayer.isAnswered) {
          // Check if reminder is due within the last minute (to avoid spamming old reminders)
          // or is in the future (schedule a timeout)
          
          const timeDiff = prayer.reminderTime - now;

          // If due now (within reasonable window) and not notified this session
          if (timeDiff <= 0 && timeDiff > -60000 && !notifiedIds.has(prayer.id)) {
            triggerNotification(prayer);
            notifiedIds.add(prayer.id);
          }
          
          // If due in the future (within this session duration, e.g., < 24h), set a timeout
          // We limit to active session to avoid setting millions of timeouts
          if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
             // Clear any existing timeout for this ID if we were storing them, 
             // but for simplicity, we just set a new one. Deduplication happens via notifiedIds.
             setTimeout(() => {
                if (!notifiedIds.has(prayer.id)) {
                    triggerNotification(prayer);
                    notifiedIds.add(prayer.id);
                }
             }, timeDiff);
          }
        }
      });
    };

    const triggerNotification = (prayer: PrayerRequest) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Prayer Reminder", {
          body: `It's time to pray for: ${prayer.title}`,
          icon: '/favicon.ico', // Assuming standard favicon
        });
      }
    };

    setupListeners();

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return null; // Invisible component
};