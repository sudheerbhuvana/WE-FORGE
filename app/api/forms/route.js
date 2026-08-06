import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Form from '@/lib/models/Form';
import { requirePermission, canManageEvent } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/forms — list all forms (admin)
export async function GET() {
  const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'forms.view'));
  if (response) return response;

  try {
    await connectDB();
    const forms = await Form.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(forms);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/forms — create a new form
export async function POST(req) {
  const { response, actor } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'forms.create'));
  if (response) return response;

  try {
    await connectDB();
    const body = await req.json();

    const { title, description, fields, isPublished, requiresLogin, allowMultiple, maxResponses, closeAt, coverImageUrl, successMessage } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Form title is required.' }, { status: 400 });
    }

    // Auto-generate slug from title
    let slug = title.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);

    // Ensure slug uniqueness
    const existing = await Form.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const form = await Form.create({
      title: title.trim(),
      slug,
      description: (description || '').trim(),
      fields: Array.isArray(fields) ? fields : [],
      isPublished: !!isPublished,
      requiresLogin: !!requiresLogin,
      allowMultiple: !!allowMultiple,
      maxResponses: maxResponses ? parseInt(maxResponses) : null,
      closeAt: closeAt ? new Date(closeAt) : null,
      coverImageUrl: (coverImageUrl || '').trim(),
      successMessage: (successMessage || '').trim() || 'Thank you! Your response has been recorded.',
      createdBy: actor?.id || '',
    });

    return NextResponse.json(form, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
