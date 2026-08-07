import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import { ensureActiveCycle } from '@/lib/contestEngine';
import { requirePermission, canManageEvent, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const { response } = await requirePermission(a => isElite(a) || hasPermission(a, 'contests.edit') || hasPermission(a, 'contests.publish') || hasPermission(a, 'contests.create'));
  if (response) return response;

  try {
    await connectDB();
    const { slug } = await params;
    const { action, hours } = await req.json();

    const template = await ContestTemplate.findOne({ slug });
    if (!template) {
      return NextResponse.json({ error: 'Contest template not found' }, { status: 404 });
    }

    if (action === 'duplicate') {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const newSlug = `${slug}-copy-${rand}`;
      const cloneData = template.toObject();
      delete cloneData._id;
      delete cloneData.id;
      cloneData.title = `Copy of ${cloneData.title}`;
      cloneData.slug = newSlug;
      cloneData.createdAt = new Date();
      cloneData.updatedAt = new Date();

      const newTemplate = await ContestTemplate.create(cloneData);
      const newCycle = await ensureActiveCycle(newTemplate);
      return NextResponse.json({ success: true, message: 'Contest duplicated', slug: newSlug });
    }

    if (action === 'publish') {
      template.isPublished = true;
      template.updatedAt = new Date();
      await template.save();
      await ensureActiveCycle(template);
      return NextResponse.json({ success: true, isPublished: true });
    }

    if (action === 'unpublish') {
      template.isPublished = false;
      template.updatedAt = new Date();
      await template.save();
      return NextResponse.json({ success: true, isPublished: false });
    }

    if (action === 'archive') {
      template.isArchived = true;
      template.updatedAt = new Date();
      await template.save();
      return NextResponse.json({ success: true, isArchived: true });
    }

    if (action === 'unarchive') {
      template.isArchived = false;
      template.updatedAt = new Date();
      await template.save();
      return NextResponse.json({ success: true, isArchived: false });
    }

    if (action === 'pause') {
      template.isPaused = true;
      template.updatedAt = new Date();
      await template.save();
      return NextResponse.json({ success: true, isPaused: true });
    }

    if (action === 'resume') {
      template.isPaused = false;
      template.updatedAt = new Date();
      await template.save();
      await ensureActiveCycle(template);
      return NextResponse.json({ success: true, isPaused: false });
    }

    if (action === 'end_early') {
      const activeCycle = await ContestCycle.findOne({ templateSlug: slug, status: { $in: ['upcoming', 'active'] } }).sort({ cycleNumber: -1 });
      if (activeCycle) {
        activeCycle.endTime = new Date();
        activeCycle.status = 'judging';
        await activeCycle.save();
      }
      return NextResponse.json({ success: true, message: 'Contest cycle ended early. Submissions closed.' });
    }

    if (action === 'extend_deadline') {
      const extHours = parseInt(hours || 24, 10);
      const activeCycle = await ContestCycle.findOne({ templateSlug: slug, status: { $in: ['upcoming', 'active', 'submission_closed', 'judging'] } }).sort({ cycleNumber: -1 });
      if (activeCycle) {
        const currEnd = new Date(activeCycle.endTime || Date.now());
        activeCycle.endTime = new Date(currEnd.getTime() + extHours * 3600000);
        if (activeCycle.endTime > new Date()) {
          activeCycle.status = 'active';
        }
        await activeCycle.save();
      }
      return NextResponse.json({ success: true, message: `Deadline extended by ${extHours} hours.` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
