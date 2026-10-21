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

  // 1. Auto-flip the live cycle to submission_closed when its scheduled end
    //    time passes — regardless of whether winners have been declared.
    //    This was the bug: cycles stayed pinned to "submission_closed" /
    //    "judging" indefinitely, blocking the next weekly cycle from spawning
    //    until an admin published results.
    if (activeCycle && ['active', 'upcoming'].includes(activeCycle.status) && now > activeCycle.endTime) {
      activeCycle.status = 'submission_closed';
      activeCycle.updatedAt = now;
      await activeCycle.save();
    }

    // 2. Return the existing cycle ONLY when it's still inside its scheduled
    //    window, OR its results have already been formally published (so the
    //    podium page still resolves to a real cycle). If the scheduled window
    //    has passed and results are unpublished, fall through and spawn the
    //    next cycle below — contest timing is the source of truth, not the
    //    winner declaration.
    const stillInWindow = activeCycle && now >= activeCycle.startTime && now <= activeCycle.endTime;
    const isPublishedOrArchived = activeCycle && (activeCycle.status === 'results_published' || activeCycle.status === 'archived');

    if (activeCycle && (stillInWindow || isPublishedOrArchived)) {
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

  // Count existing cycles — find max cycleNumber to avoid duplicates
  const maxDoc = await ContestCycle.findOne({ templateId: template._id })
    .sort({ cycleNumber: -1 })
    .select({ cycleNumber: 1 })
    .lean();

  // One-time / immediate contests only ever run 1 cycle. Never spawn additional cycles after cycle 1 finishes.
  if ((template.type === 'one_time' || template.type === 'immediate') && (maxDoc?.cycleNumber || 0) >= 1) {
    return activeCycle;
  }

  const nextCycleNum = (maxDoc?.cycleNumber || 0) + 1;

  let newStart = now;
  let newEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let cycleLabel = `Cycle #${nextCycleNum}`;

  if (template.type === 'one_time') {
    newStart = template.schedule?.startDate || now;
    newEnd = template.schedule?.endDate || newEnd;
    cycleLabel = `Edition #${nextCycleNum}`;
  } else if (template.type === 'immediate') {
    newStart = now;
    newEnd = template.schedule?.endDate || newEnd;
    cycleLabel = `Edition #${nextCycleNum}`;
  } else if (template.type === 'recurring_weekly') {
      // The recurrence helper aligns to the *most recent* startDay, which puts
      // `start` in the past. If we've somehow fallen behind by more than one
      // cycle window (e.g. the bot was paused), `end` will also be in the past
      // and the new cycle would be born already submission_closed — causing an
      // infinite spawn loop on every request. Advance forward until the window
      // contains `now`.
      let ref = new Date(now);
      for (let i = 0; i < 12; i++) {
        const dates = getWeeklyRecurrenceDates(template.schedule || {}, ref);
        if (dates.end >= now) {
          newStart = dates.start;
          newEnd = dates.end;
          break;
        }
        ref = new Date(ref.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      cycleLabel = `Edition #${nextCycleNum} (Week ${getWeekNumber(now)})`;
    } else if (template.type === 'recurring_monthly') {
      let ref = new Date(now);
      for (let i = 0; i < 12; i++) {
        const dates = getMonthlyRecurrenceDates(template.schedule || {}, ref);
        if (dates.end >= now) {
          newStart = dates.start;
          newEnd = dates.end;
          break;
        }
        // Advance to next month
        ref = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      }
      cycleLabel = `Edition #${nextCycleNum} (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
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
