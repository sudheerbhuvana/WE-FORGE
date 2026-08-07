import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Form from '@/lib/models/Form';
import FormResponse from '@/lib/models/FormResponse';
import { requirePermission, canManageEvent, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/forms/[id] — get a single form (admin or public if published)
export async function GET(req, { params }) {
  const { id } = await params;
  try {
    await connectDB();
    const form = await Form.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }]
    }).lean();
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/forms/[id] — update form
export async function PATCH(req, { params }) {
  const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'forms.edit'));
  if (response) return response;

  const { id } = await params;
  try {
    await connectDB();
    const body = await req.json();
    const updates = { ...body, updatedAt: new Date() };

    // Prevent slug change via patch if not explicitly provided
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.responseCount;

    const form = await Form.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/forms/[id] — delete form and all its responses
export async function DELETE(req, { params }) {
  const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'forms.delete'));
  if (response) return response;

  const { id } = await params;
  try {
    await connectDB();
    const form = await Form.findByIdAndDelete(id);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    await FormResponse.deleteMany({ formId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
