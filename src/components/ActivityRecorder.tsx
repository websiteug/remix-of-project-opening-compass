import { useEffect } from 'react';
import { listenForActivities } from '@/lib/activityCapture';
import { recordActivity } from '@/lib/activityService';

// Operational admin records use the app's existing Firestore, not Lovable analytics.
export default function ActivityRecorder() {
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    return listenForActivities(activity => {
      void recordActivity(activity, sessionId).catch(() => {
        // A denied/offline logging write must never interrupt a visitor's click.
      });
    });
  }, []);
  return null;
}