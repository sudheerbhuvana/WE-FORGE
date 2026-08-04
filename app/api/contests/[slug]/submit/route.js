import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import ContestSubmission from '@/lib/models/ContestSubmission';
import { ensureActiveCycle } from '@/lib/contestEngine';
import { getActor } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const cycleNum = searchParams.get('cycle');

    const template = await ContestTemplate.findOne({ slug });
    if (!template) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    let cycle = null;
    if (cycleNum) {
      cycle = await ContestCycle.findOne({ templateSlug: slug, cycleNumber: parseInt(cycleNum, 10) });
    } else {
      cycle = await ensureActiveCycle(template);
    }

    if (!cycle) {
      return NextResponse.json({ submission: null });
    }

    const submission = await ContestSubmission.findOne({
      cycleId: cycle._id,
      memberId: actor.id,
    }).lean();

    return NextResponse.json({ submission: submission || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized. Please log in to submit.' }, { status: 401 });
  }

  try {
    await connectDB();
    const { slug } = await params;

    const template = await ContestTemplate.findOne({ slug });
    if (!template) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const cycle = await ensureActiveCycle(template);
    if (!cycle) {
      return NextResponse.json({ error: 'No active cycle found for this contest' }, { status: 400 });
    }

    const now = new Date();
    if (cycle.status !== 'active' || now > new Date(cycle.endTime)) {
      return NextResponse.json({ error: 'Submissions for this contest cycle are closed' }, { status: 400 });
    }

    const body = await req.json();
    const customAnswers = Array.isArray(body.customAnswers) ? body.customAnswers : [];
    const title = (body.title || customAnswers.find(a => a.value && typeof a.value === 'string')?.value || 'Contest Entry').trim();
    const description = (body.description || '').trim();
    const fileUrl = (body.fileUrl || '').trim();
    const rawLinks = Array.isArray(body.workLinks) ? body.workLinks : [];

    // Validate required custom fields if template defines customFields
    if (Array.isArray(template.customFields) && template.customFields.length > 0) {
      for (const f of template.customFields) {
        if (f.required) {
          const ans = customAnswers.find(a => a.fieldId === f.id);
          const val = ans?.value;
          const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
          if (isEmpty) {
            return NextResponse.json({ error: `Field "${f.label}" is required` }, { status: 400 });
          }
        }
      }
    }

    const workLinks = rawLinks
      .filter(l => l && typeof l.url === 'string' && l.url.trim())
      .map(l => ({
        title: (l.title || 'Work Link').trim().slice(0, 100),
        url: l.url.trim().slice(0, 500),
      }))
      .slice(0, 10);

    const isNew = !(await ContestSubmission.exists({ cycleId: cycle._id, memberId: actor.id }));

    const submissionData = {
      cycleId: cycle._id,
      templateSlug: slug,
      memberId: actor.id,
      email: actor.email,
      name: actor.name,
      rollNumber: actor.rollNumber || actor.id,
      title,
      description,
      fileUrl,
      workLinks,
      customAnswers,
      updatedAt: new Date(),
    };

    const submission = await ContestSubmission.findOneAndUpdate(
      { cycleId: cycle._id, memberId: actor.id },
      { 
        $set: submissionData,
        $setOnInsert: { status: 'submitted', submittedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    // Update cycle counts if new submission
    if (isNew) {
      const subCount = await ContestSubmission.countDocuments({ cycleId: cycle._id });
      const partCount = (await ContestSubmission.distinct('memberId', { cycleId: cycle._id })).length;
      await ContestCycle.findByIdAndUpdate(cycle._id, {
        $set: { submissionCount: subCount, participantCount: partCount }
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { slug } = await params;

    const template = await ContestTemplate.findOne({ slug });
    if (!template) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const cycle = await ensureActiveCycle(template);
    if (!cycle || cycle.status !== 'active') {
      return NextResponse.json({ error: 'Cannot withdraw submission after deadline' }, { status: 400 });
    }

    await ContestSubmission.deleteOne({ cycleId: cycle._id, memberId: actor.id });

    // Recalculate cycle counts
    const subCount = await ContestSubmission.countDocuments({ cycleId: cycle._id });
    const partCount = (await ContestSubmission.distinct('memberId', { cycleId: cycle._id })).length;
    await ContestCycle.findByIdAndUpdate(cycle._id, {
      $set: { submissionCount: subCount, participantCount: partCount }
    });

    return NextResponse.json({ success: true, message: 'Submission withdrawn' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
