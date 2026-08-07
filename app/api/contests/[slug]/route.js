import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import ContestSubmission from '@/lib/models/ContestSubmission';
import { ensureActiveCycle } from '@/lib/contestEngine';
import { requirePermission, canManageEvent, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const requestedCycleNum = searchParams.get('cycle');

    const template = await ContestTemplate.findOne({ slug }).lean();
    if (!template) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const activeCycle = await ensureActiveCycle(template);

    let targetCycle = activeCycle;
    if (requestedCycleNum) {
      const specificCycle = await ContestCycle.findOne({ 
        templateSlug: slug, 
        cycleNumber: parseInt(requestedCycleNum, 10) 
      }).lean();
      if (specificCycle) {
        targetCycle = specificCycle;
      }
    }

    const totalCycles = await ContestCycle.countDocuments({ templateSlug: slug });
    const allCycles = await ContestCycle.find({ templateSlug: slug })
      .select('cycleNumber cycleLabel startTime endTime status resultsPublishedAt participantCount submissionCount')
      .sort({ cycleNumber: -1 })
      .lean();

    return NextResponse.json({
      template,
      activeCycle: activeCycle ? (activeCycle.toObject ? activeCycle.toObject() : activeCycle) : null,
      targetCycle: targetCycle ? (targetCycle.toObject ? targetCycle.toObject() : targetCycle) : null,
      totalCycles,
      historyCycles: allCycles,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'contests.edit') || hasPermission(a, 'contests.publish'));
  if (response) return response;

  try {
    await connectDB();
    const { slug } = await params;
    const body = await req.json();

    const template = await ContestTemplate.findOne({ slug });
    if (!template) {
      return NextResponse.json({ error: 'Contest template not found' }, { status: 404 });
    }

    const patch = {};
    if (typeof body.title === 'string') patch.title = body.title.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (typeof body.bannerUrl === 'string') patch.bannerUrl = body.bannerUrl.trim();
    if (typeof body.rules === 'string') patch.rules = body.rules.trim();
    if (typeof body.eligibility === 'string') patch.eligibility = body.eligibility.trim();
    if (typeof body.submissionGuidelines === 'string') patch.submissionGuidelines = body.submissionGuidelines.trim();
    if (typeof body.prizeInfo === 'string') patch.prizeInfo = body.prizeInfo.trim();
    if (typeof body.type === 'string') patch.type = body.type;
    if (typeof body.visibility === 'string') patch.visibility = body.visibility;
    if (typeof body.featured === 'boolean') patch.featured = body.featured;
    if (typeof body.isPaused === 'boolean') patch.isPaused = body.isPaused;
    if (typeof body.isPublished === 'boolean') {
      if (!isElite(actor) && !hasPermission(actor, 'contests.publish')) {
        return NextResponse.json({ error: 'Forbidden: Missing contests.publish permission' }, { status: 403 });
      }
      patch.isPublished = body.isPublished;
    }
    if (body.schedule) patch.schedule = body.schedule;
    if (Array.isArray(body.customFields)) patch.customFields = body.customFields;
    patch.updatedAt = new Date();

    const updatedTemplate = await ContestTemplate.findOneAndUpdate(
      { slug },
      { $set: patch },
      { new: true }
    );

    // Re-ensure active cycle configuration matches schedule updates
    const activeCycle = await ensureActiveCycle(updatedTemplate);

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      activeCycle,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { response } = await requirePermission(a => isElite(a) || hasPermission(a, 'contests.delete'));
  if (response) return response;

  try {
    await connectDB();
    const { slug } = await params;

    const template = await ContestTemplate.findOne({ slug });
    if (!template) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    await ContestSubmission.deleteMany({ templateSlug: slug });
    await ContestCycle.deleteMany({ templateSlug: slug });
    await ContestTemplate.deleteOne({ slug });

    return NextResponse.json({ success: true, message: 'Contest deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
