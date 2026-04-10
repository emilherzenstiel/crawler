import cron from 'node-cron';

export function startScheduler(task: () => Promise<void>, cronExpression = '*/30 * * * *') {
  console.log(`[Scheduler] Starting with schedule: ${cronExpression}`);
  cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Running task at ${new Date().toISOString()}`);
    try {
      await task();
    } catch (err) {
      console.error('[Scheduler] Task failed:', err);
    }
  });
}
