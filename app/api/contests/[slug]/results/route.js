import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import ContestSubmission from '@/lib/models/ContestSubmission';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { response } = await requirePermission(canManageEvent);
  if (response) return response;

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
      cycle = await ContestCycle.findById(template.activeCycleId);
    }

    if (!cycle) {
      return NextResponse.json({ submissions: [], cycle: null });
    }

    const submissions = await ContestSubmission.find({ cycleId: cycle._id })
      .sort({ score: -1, submittedAt: 1 })
      .lean();

    return NextResponse.json({
      cycle,
      submissions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { response } = await requirePermission(canManageEvent);
  if (response) return response;

  try {
    await connectDB();
    const { slug } = await params;
    const body = await req.json();

    const { cycleId, winners, announcementNotes, status } = body;
    if (!cycleId) {
      return NextResponse.json({ error: 'Cycle ID is required' }, { status: 400 });
    }

    const cycle = await ContestCycle.findById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Contest cycle not found' }, { status: 404 });
    }

    // Auto-resolve Member names and details if missing
    const cleanWinners = [];
    if (Array.isArray(winners)) {
      const Member = (await import('@/lib/models/Member')).default;
      for (const w of winners) {
        let name = (w.name || '').trim();
        let email = (w.email || '').trim();
        let rollNumber = (w.rollNumber || '').trim();

        if (!name && w.memberId) {
          const mem = await Member.findOne({ $or: [{ memberId: w.memberId }, { rollNumber: w.memberId }] }).lean();
          if (mem) {
            name = mem.name || mem.fullName || '';
            email = email || mem.email || '';
            rollNumber = rollNumber || mem.rollNumber || mem.memberId || '';
          }
        }

        if (!name && w.submissionId) {
          const sub = await ContestSubmission.findById(w.submissionId).lean();
          if (sub) {
            name = name || sub.authorName || '';
            email = email || sub.authorEmail || '';
            rollNumber = rollNumber || sub.authorRollNumber || '';
          }
        }

        cleanWinners.push({
          rank: parseInt(w.rank, 10) || 1,
          memberId: w.memberId || '',
          name: name || w.memberId || 'Participant',
          email,
          rollNumber: rollNumber || w.memberId || '',
          awardTitle: (w.awardTitle || '').trim(),
          judgeNotes: (w.judgeNotes || '').trim(),
          submissionId: w.submissionId || null,
        });
      }
    }

    const newStatus = status || 'results_published';

    const updatedCycle = await ContestCycle.findByIdAndUpdate(
      cycleId,
      {
        $set: {
          winners: cleanWinners,
          announcementNotes: (announcementNotes || '').trim(),
          status: newStatus,
          resultsPublishedAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      cycle: updatedCycle,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
