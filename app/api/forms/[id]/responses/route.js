import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Form from '@/lib/models/Form';
import FormResponse from '@/lib/models/FormResponse';
import { requirePermission, canManageEvent, getActor } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/forms/[id]/responses — admin: get all responses for a form
export async function GET(req, { params }) {
  const { response } = await requirePermission(canManageEvent);
  if (response) return response;

  const { id } = await params;
  try {
    await connectDB();
    const responses = await FormResponse.find({ formId: id }).sort({ submittedAt: -1 }).lean();
    return NextResponse.json(responses);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/forms/[id]/responses — public: submit a form response
export async function POST(req, { params }) {
  const { id } = await params;
  try {
    await connectDB();

    // Find form by ID or slug
    const form = await Form.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }]
    });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    if (!form.isPublished) return NextResponse.json({ error: 'This form is not currently open.' }, { status: 403 });

    // Check close date
    if (form.closeAt && new Date() > new Date(form.closeAt)) {
      return NextResponse.json({ error: 'This form has closed.' }, { status: 403 });
    }

    // Check max responses
    if (form.maxResponses && form.responseCount >= form.maxResponses) {
      return NextResponse.json({ error: 'This form has reached its response limit.' }, { status: 403 });
    }

    // Get actor if login required
    let actor = null;
    if (form.requiresLogin) {
      actor = await getActor();
      if (!actor) return NextResponse.json({ error: 'You must be logged in to submit this form.' }, { status: 401 });
    } else {
      actor = await getActor(); // optional actor
    }

    // If login required and not allowing multiple, check for existing response
    if (form.requiresLogin && !form.allowMultiple && actor) {
      const existing = await FormResponse.findOne({ formId: form._id, submittedBy: actor.id });
      if (existing) {
        return NextResponse.json({ error: 'You have already submitted a response to this form.' }, { status: 409 });
      }
    }

    const body = await req.json();
    const answers = body.answers || {};

    // Validate required fields
    for (const field of form.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          return NextResponse.json({ error: `"${field.label}" is required.` }, { status: 400 });
        }
      }
    }

    // Save response
    const formResponse = await FormResponse.create({
      formId: form._id,
      formSlug: form.slug,
      submittedBy: actor?.id || 'anonymous',
      submitterName: actor?.name || (body.submitterName || ''),
      submitterEmail: actor?.email || (body.submitterEmail || ''),
      submitterRoll: actor?.rollNumber || '',
      answers,
    });

    // Increment response count
    await Form.findByIdAndUpdate(form._id, { $inc: { responseCount: 1 } });

    return NextResponse.json({ success: true, responseId: formResponse._id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
