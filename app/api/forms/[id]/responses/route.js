import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '@/lib/db';
import Form from '@/lib/models/Form';
import FormResponse from '@/lib/models/FormResponse';
import { requirePermission, canManageEvent, getActor, isElite, hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadToR2, isR2Configured } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// Read the session directly (bypassing the Member collection). Used as a
// fallback for the dedupe path: if `getActor()` returned null because the
// OAuth user has no Member row yet, we still need a stable identifier, so
// we fall back to `session.user.email`.
async function getServerSessionSafe() {
  try { return await getServerSession(authOptions); } catch { return null; }
}

// GET /api/forms/[id]/responses — admin: get all responses for a form
export async function GET(req, { params }) {
  const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'forms.view_submissions') || hasPermission(actor, 'forms.export_responses'));
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
//
// Accepts either application/json (no file fields) or multipart/form-data
// (when the form contains file fields). Files are uploaded to R2 (with a
// local-disk fallback) and stored in the response under the matching field id.
//
// Duplicate-submission policy (when `allowMultiple === false`):
//   • Logged-in users → one response per stable identifier, ever.
//     Priority: Member ObjectId → Member rollNumber → session email.
//     This covers the case where a Member document isn't yet provisioned for
//     an OAuth user — `actor.id` would be undefined and we'd falsely fall
//     through to the IP branch.
//   • Anonymous users → one response per IP within the last 24 hours
//     (best-effort spam defence for forms that don't require login).
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

    // Resolve client IP (used for anonymous dedupe). Prefer the first hop
    // from X-Forwarded-For so this works behind reverse proxies / Vercel.
    const xff = req.headers.get('x-forwarded-for') || '';
    const ipAddress =
      (xff.split(',')[0] || '').trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      '';

    // Build the stable identifier we'll save + dedupe on. Priority order:
    //   1. Member ObjectId (most stable, persists across email changes)
    //   2. Member rollNumber (only if explicitly present)
    //   3. Session email (works for OAuth users not yet in our Members table)
    //   4. The literal string "anonymous" — last resort.
    const session = actor ? null : await getServerSessionSafe();
    const actorEmail = actor?.email || session?.user?.email || '';
    const actorRoll = actor?.rollNumber || '';
    const submittedBy =
      (actor && actor.id && actor.id.toString()) ||
      actorRoll ||
      actorEmail ||
      'anonymous';

    // Duplicate-submission guard. Only enforce when `allowMultiple` is off.
    if (!form.allowMultiple) {
      // Logged-in path: dedupe by the stable identifier derived above.
      if (submittedBy !== 'anonymous') {
        const existing = await FormResponse.findOne({
          formId: form._id,
          submittedBy,
        });
        if (existing) {
          return NextResponse.json(
            { error: 'You have already submitted a response to this form.' },
            { status: 409 }
          );
        }
      } else if (ipAddress) {
        // Anonymous: dedupe by IP within 24h. Doesn't catch a determined
        // spammer who rotates IPs, but blocks trivial double-clicks, refresh
        // re-submits, and bots hammering the same endpoint.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await FormResponse.findOne({
          formId: form._id,
          ipAddress,
          submittedAt: { $gte: since },
        });
        if (recent) {
          return NextResponse.json(
            { error: 'A response from this device was recently submitted. Please try again later.' },
            { status: 409 }
          );
        }
      }
    }

    // ---- Parse body (JSON or multipart) ----
    const contentType = req.headers.get('content-type') || '';
    let answers = {};
    let submitterName = '';
    let submitterEmail = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const rawAnswers = formData.get('answers');
      if (rawAnswers) {
        try { answers = JSON.parse(rawAnswers.toString()); } catch { answers = {}; }
      }
      submitterName = (formData.get('submitterName') || '').toString();
      submitterEmail = (formData.get('submitterEmail') || '').toString();

      // Collect uploaded files (parallel arrays, same shape as the contests submit route).
      const files = formData.getAll('files').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);
      const fileFieldIds = formData.getAll('fileFieldIds').map(v => v.toString());

      if (files.length > 0) {
        const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
        const timestamp = Date.now();
        const uploadedFilesByField = {};

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fieldId = fileFieldIds[i] || '';
          const fieldDef = (form.fields || []).find(f => f.id === fieldId);

          if (!fieldDef) {
            return NextResponse.json({ error: `Unknown file field "${fieldId}".` }, { status: 400 });
          }
          if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json(
              { error: `"${file.name}" exceeds the 25 MB file size limit.` },
              { status: 400 }
            );
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
          const key = `forms/${form.slug}/${fieldId}/${timestamp}_${i}_${safeName}`;

          let url;
          try {
            if (isR2Configured()) {
              url = await uploadToR2(buffer, key, file.type || 'application/octet-stream');
            } else {
              // Local-disk fallback (mirrors saveFile() in lib/uploadHelper.js)
              const localDir = path.join(process.cwd(), 'public', 'uploads', 'forms', form.slug, fieldId);
              if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
              const filename = `${timestamp}_${i}_${safeName}`;
              fs.writeFileSync(path.join(localDir, filename), buffer);
              url = `/uploads/forms/${form.slug}/${fieldId}/${filename}`;
            }
          } catch (e) {
            return NextResponse.json({ error: `Upload of "${file.name}" failed: ${e.message}` }, { status: 500 });
          }

          uploadedFilesByField[fieldId] = uploadedFilesByField[fieldId] || [];
          uploadedFilesByField[fieldId].push({
            url,
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });
        }

        // Merge file metadata into answers so it lives alongside the field value.
        for (const [fieldId, fileList] of Object.entries(uploadedFilesByField)) {
          answers[fieldId] = fileList.length === 1 ? fileList[0] : fileList;
        }
      }
    } else {
      const body = await req.json();
      answers = body.answers || {};
      submitterName = body.submitterName || '';
      submitterEmail = body.submitterEmail || '';
    }

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
      submittedBy,
      submitterName: actor?.name || submitterName,
      submitterEmail: actor?.email || submitterEmail,
      submitterRoll: actor?.rollNumber || '',
      ipAddress,
      answers,
    });

    // Increment response count
    await Form.findByIdAndUpdate(form._id, { $inc: { responseCount: 1 } });

    return NextResponse.json({ success: true, responseId: formResponse._id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
