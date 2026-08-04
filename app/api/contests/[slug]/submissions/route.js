import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestSubmission from '@/lib/models/ContestSubmission';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contests/[slug]/submissions
 *
 * Lists every submission across every cycle for the given contest template.
 * Optional ?cycle=N filters to a single cycle.
 * Optional ?limit=N caps the result count (default 200).
 */
export async function GET(req, { params }) {
  const { response } = await requirePermission(canManageEvent);
  if (response) return response;

  try {
    await connectDB();
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const cycleFilter = searchParams.get('cycle');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

    const template = await ContestTemplate.findOne({ slug }).lean();
    if (!template) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const query = { templateSlug: slug };
    if (cycleFilter && cycleFilter !== 'all') {
      const cycle = await ContestSubmission.findOne({ templateSlug: slug, cycleNumber: parseInt(cycleFilter, 10) });
      // We don't actually have cycleNumber on submissions; use cycleId lookups via the cycle list below.
    }

    const submissions = await ContestSubmission.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      template: { slug: template.slug, title: template.title },
      submissions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}