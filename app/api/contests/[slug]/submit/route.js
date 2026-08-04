import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import ContestSubmission from '@/lib/models/ContestSubmission';
import { ensureActiveCycle } from '@/lib/contestEngine';
import { getActor } from '@/lib/permissions';
import { uploadToR2 } from '@/lib/r2';

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

    const contentType = req.headers.get('content-type') || '';
    let customAnswers = [];
    let title = '';
    let description = '';
    let fileUrl = '';
    let rawLinks = [];
    let uploadedFiles = []; // [{ fieldId, fieldLabel, fieldType, url, s3Key, mimeType, fileSize, originalName }]

    if (contentType.includes('multipart/form-data')) {
      // ---- Multipart: file uploads + form fields ----
      const formData = await req.formData();

      const customAnswersRaw = formData.get('customAnswers');
      if (customAnswersRaw) {
        try { customAnswers = JSON.parse(customAnswersRaw.toString()); } catch { customAnswers = []; }
      }

      title = (formData.get('title') || '').toString().trim();
      description = (formData.get('description') || '').toString().trim();
      fileUrl = (formData.get('fileUrl') || '').toString().trim();

      const workLinksRaw = formData.get('workLinks');
      if (workLinksRaw) {
        try { rawLinks = JSON.parse(workLinksRaw.toString()); } catch { rawLinks = []; }
      }

      // Collect uploaded files: parallel arrays 'files' + 'fileFieldIds'
      const files = formData.getAll('files').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);
      const fieldIds = formData.getAll('fileFieldIds').map(v => v.toString());
      const fieldLabels = formData.getAll('fileFieldLabels').map(v => v.toString());
      const fieldTypes = formData.getAll('fileFieldTypes').map(v => v.toString());

      if (files.length > 0) {
        // Validate per-field counts before any upload
        const counts = {};
        files.forEach((_, i) => {
          const fid = fieldIds[i] || '';
          counts[fid] = (counts[fid] || 0) + 1;
        });
        for (const f of (template.customFields || [])) {
          if ((counts[f.id] || 0) > (f.maxCount || 999)) {
            return NextResponse.json(
              { error: `Too many files uploaded for "${f.label}". Limit is ${f.maxCount}.` },
              { status: 400 }
            );
          }
        }

        const timestamp = Date.now();
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const fid = fieldIds[i] || 'misc';
          const flbl = fieldLabels[i] || '';
          const ftype = fieldTypes[i] || 'file';
          const fdef = (template.customFields || []).find(cf => cf.id === fid);

          // Per-file size validation
          const maxMB = fdef?.maxSizeMB || 25;
          if (f.size > maxMB * 1024 * 1024) {
            return NextResponse.json(
              { error: `"${f.name}" exceeds the ${maxMB} MB limit for "${fdef?.label || fid}".` },
              { status: 400 }
            );
          }

          // Validate mime-type matches field type
          const isImage = f.type.startsWith('image/');
          const isVideo = f.type.startsWith('video/');
          if (ftype === 'image' && !isImage) {
            return NextResponse.json({ error: `"${f.name}" is not an image file.` }, { status: 400 });
          }
          if (ftype === 'video' && !isVideo) {
            return NextResponse.json({ error: `"${f.name}" is not a video file.` }, { status: 400 });
          }

          const buffer = Buffer.from(await f.arrayBuffer());
          const safeName = f.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
          const key = `contests/${slug}/cycle_${cycle.cycleNumber}/${actor.id}/${timestamp}_${i}_${safeName}`;

          let url;
          try {
            url = await uploadToR2(buffer, key, f.type);
          } catch (e) {
            return NextResponse.json(
              { error: `Upload of "${f.name}" failed: ${e.message}` },
              { status: 500 }
            );
          }

          uploadedFiles.push({
            fieldId: fid,
            fieldLabel: flbl,
            fieldType: ftype,
            url,
            s3Key: key,
            mimeType: f.type,
            fileSize: f.size,
            originalName: f.name,
          });
        }
      }
    } else {
      // ---- JSON: legacy path (URLs only) ----
      const body = await req.json();
      customAnswers = Array.isArray(body.customAnswers) ? body.customAnswers : [];
      title = (body.title || '').trim();
      description = (body.description || '').trim();
      fileUrl = (body.fileUrl || '').trim();
      rawLinks = Array.isArray(body.workLinks) ? body.workLinks : [];
    }

    if (!title) {
      title = (customAnswers.find(a => a.value && typeof a.value === 'string')?.value || 'Contest Entry').trim();
    }

    // Validate required custom fields if template defines customFields
    if (Array.isArray(template.customFields) && template.customFields.length > 0) {
      for (const f of template.customFields) {
        if (!f.required) continue;
        const ans = customAnswers.find(a => a.fieldId === f.id);
        const val = ans?.value;
        const hasFile = uploadedFiles.some(uf => uf.fieldId === f.id);

        // For `link` fields, also accept the dedicated workLinks[] which is
        // where the UI actually stores the link list.
        const hasLink = (f.type === 'link') && rawLinks.some(l => l && typeof l.url === 'string' && l.url.trim());

        const isEmpty = !hasLink && !hasFile && (
          val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)
        );
        if (isEmpty) {
          return NextResponse.json({ error: `Field "${f.label}" is required` }, { status: 400 });
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

    // Merge uploaded files with any previously-uploaded files (so re-submitting
    // doesn't blow away existing files unless explicitly replaced).
    const existingSub = isNew ? null : await ContestSubmission.findOne({
      cycleId: cycle._id, memberId: actor.id,
    }).lean();
    const previousFiles = Array.isArray(existingSub?.files) ? existingSub.files : [];
    const replacedFieldIds = new Set(uploadedFiles.map(f => f.fieldId));
    const mergedFiles = [
      ...previousFiles.filter(pf => !replacedFieldIds.has(pf.fieldId)),
      ...uploadedFiles,
    ];

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
      files: mergedFiles,
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
