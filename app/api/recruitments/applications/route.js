import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RecruitmentApplication from '@/lib/models/RecruitmentApplication';
import { requirePermission, canAccessAdmin, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { actor, response } = await requirePermission(a => hasPermission(a, 'recruitments.view_applications'));
  if (response) return response;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const domainFilter = searchParams.get('domain');
    const yearFilter = searchParams.get('year');
    const statusFilter = searchParams.get('status');
    const q = (searchParams.get('search') || '').trim().toLowerCase();

    const query = {};
    if (domainFilter && domainFilter !== 'all') {
      query.$or = [{ primaryDomain: domainFilter }, { secondaryDomain: domainFilter }];
    }
    if (yearFilter && yearFilter !== 'all') {
      query.year = yearFilter;
    }
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }

    let applications = await RecruitmentApplication.find(query).sort({ submittedAt: -1 }).lean();

    if (q) {
      applications = applications.filter((app) => 
        (app.name || '').toLowerCase().includes(q) ||
        (app.email || '').toLowerCase().includes(q) ||
        (app.rollNumber || '').toLowerCase().includes(q) ||
        (app.whyDomain || '').toLowerCase().includes(q)
      );
    }

    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'recruitments.change_app_status') || hasPermission(a, 'recruitments.edit_application') || hasPermission(a, 'recruitments.schedule_interview'));
  if (response) return response;

  try {
    await connectDB();
    const body = await req.json();
    const { id, status, adminNotes, interviewSlot } = body;

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const patch = {};
    if (['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
      if (!isElite(actor) && !hasPermission(actor, 'recruitments.change_app_status')) {
        return NextResponse.json({ error: 'Forbidden: Missing recruitments.change_app_status permission' }, { status: 403 });
      }
      patch.status = status;
    }
    if (typeof adminNotes === 'string') {
      if (!isElite(actor) && !hasPermission(actor, 'recruitments.edit_application')) {
        return NextResponse.json({ error: 'Forbidden: Missing recruitments.edit_application permission' }, { status: 403 });
      }
      patch.adminNotes = adminNotes;
    }
    if (interviewSlot !== undefined) {
      if (!isElite(actor) && !hasPermission(actor, 'recruitments.schedule_interview')) {
        return NextResponse.json({ error: 'Forbidden: Missing recruitments.schedule_interview permission' }, { status: 403 });
      }
      patch.interviewSlot = interviewSlot;
    }
    patch.updatedAt = new Date();

    const updated = await RecruitmentApplication.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { actor, response } = await requirePermission(a => hasPermission(a, 'recruitments.delete_applications'));
  if (response) return response;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const deleted = await RecruitmentApplication.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
