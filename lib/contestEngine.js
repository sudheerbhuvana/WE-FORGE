import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';

/**
 * Calculates start & end dates for a weekly recurring schedule based on template config.
 */
export function getWeeklyRecurrenceDates(schedule, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  const startDay = schedule.startDay ?? 0; // 0 = Sun
  const [sHour, sMin] = (schedule.startTime || '00:00').split(':').map(Number);
  
  // Align start to the most recent startDay
  const diff = (start.getDay() - startDay + 7) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(sHour, sMin, 0, 0);

  const end = new Date(start);
  const endDay = schedule.endDay ?? 6;
  const [eHour, eMin] = (schedule.endTime || '23:59').split(':').map(Number);
  
  let dayDiff = (endDay - startDay + 7) % 7;
  if (dayDiff === 0) dayDiff = 6; // full week duration
  end.setDate(start.getDate() + dayDiff);
  end.setHours(eHour, eMin, 59, 999);

  return { start, end };
}

/**
 * Calculates start & end dates for a monthly recurring schedule.
 */
export function getMonthlyRecurrenceDates(schedule, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const startDay = Math.min(schedule.startDayOfMonth || 1, 28);
  const endDay = Math.min(schedule.endDayOfMonth || 28, 31);
  const [sHour, sMin] = (schedule.startTime || '00:00').split(':').map(Number);
  const [eHour, eMin] = (schedule.endTime || '23:59').split(':').map(Number);

  const start = new Date(year, month, startDay, sHour, sMin, 0, 0);
  const lastDayOfM = new Date(year, month + 1, 0).getDate();
  const targetEndDay = Math.min(endDay, lastDayOfM);
  const end = new Date(year, month, targetEndDay, eHour, eMin, 59, 999);

  return { start, end };
}

/**
 * Ensures a contest template has a valid active cycle, transitions expired active cycles,
 * and creates new recurring cycles automatically when schedule rolls over.
 */
export async function ensureActiveCycle(template) {
  if (!template) return null;
  await connectDB();

  const now = new Date();
  let activeCycle = null;

  if (template.activeCycleId) {
    activeCycle = await ContestCycle.findById(template.activeCycleId);
  }

  // 1. Check if existing active cycle status needs automatic update
  if (activeCycle && activeCycle.status === 'active' && now > activeCycle.endTime) {
    activeCycle.status = 'submission_closed';
    activeCycle.updatedAt = now;
    await activeCycle.save();
  }

  // 2. If active cycle is still valid or ongoing, return it
  if (activeCycle && (activeCycle.status === 'active' || activeCycle.status === 'upcoming' || activeCycle.status === 'submission_closed' || activeCycle.status === 'judging')) {
    if (activeCycle.status === 'upcoming' && now >= activeCycle.startTime && now <= activeCycle.endTime) {
      activeCycle.status = 'active';
      activeCycle.updatedAt = now;
      await activeCycle.save();
    }
    return activeCycle;
  }

  // 3. Spawning new cycle if recurring or missing cycle 1
  if (template.isPaused || !template.isPublished) {
    return activeCycle;
  }

  // Count existing cycles
  const cycleCount = await ContestCycle.countDocuments({ templateId: template._id });
  const nextCycleNum = cycleCount + 1;

  let newStart = now;
  let newEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let cycleLabel = `Cycle #${nextCycleNum}`;

  if (template.type === 'one_time') {
    newStart = template.schedule?.startDate || now;
    newEnd = template.schedule?.endDate || newEnd;
    cycleLabel = 'Edition #1';
  } else if (template.type === 'immediate') {
    newStart = now;
    newEnd = template.schedule?.endDate || newEnd;
    cycleLabel = 'Edition #1';
  } else if (template.type === 'recurring_weekly') {
    const dates = getWeeklyRecurrenceDates(template.schedule || {}, now);
    newStart = dates.start;
    newEnd = dates.end;
    cycleLabel = `Week ${getWeekNumber(now)}`;
  } else if (template.type === 'recurring_monthly') {
    const dates = getMonthlyRecurrenceDates(template.schedule || {}, now);
    newStart = dates.start;
    newEnd = dates.end;
    cycleLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const initialStatus = (now < newStart) ? 'upcoming' : (now <= newEnd ? 'active' : 'submission_closed');

  const newCycle = await ContestCycle.create({
    templateId: template._id,
    templateSlug: template.slug,
    cycleNumber: nextCycleNum,
    cycleLabel,
    startTime: newStart,
    endTime: newEnd,
    status: initialStatus,
  });

  // Link new active cycle to template
  await ContestTemplate.findByIdAndUpdate(template._id, {
    $set: { activeCycleId: newCycle._id }
  });

  return newCycle;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
