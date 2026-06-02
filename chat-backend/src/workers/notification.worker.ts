import { Worker, Job } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';
import { firebaseAdmin } from '../config/firebase';
import { UserRepository } from '../repositories/user.repository';

const userRepository = new UserRepository();

export const notificationWorker = new Worker('notification-queue', async (job: Job) => {
  if (job.name === 'send-push') {
    const { userId, title, body, data } = job.data;
    
    // 1. Get the user's FCM token from DB
    const user = await userRepository.findById(userId);
    if (!user || !user.fcmToken) {
      // Silently skip if no FCM token is present (e.g., for web clients relying on native notifications)
      return;
    }

    // 2. Build the Firebase payload
    const message = {
      notification: { title, body },
      data: data || {},
      token: user.fcmToken
    };

    // 3. Send via Firebase
    try {
      const response = await firebaseAdmin.messaging().send(message);
      console.log(`🔔 [Notification Worker] Push sent successfully: ${response}`);
    } catch (error: any) {
      // Gracefully handle if firebase is misconfigured locally
      if (error.code === 'messaging/invalid-argument' || error.message.includes('credential')) {
         console.warn(`⚠️ [Notification Worker] Firebase misconfigured, skipped push.`);
      } else {
         console.error(`❌ [Notification Worker] Push failed:`, error.message);
      }
    }
  }
}, { 
  connection: bullRedisConnection as any,
  lockDuration: 60000 
});
