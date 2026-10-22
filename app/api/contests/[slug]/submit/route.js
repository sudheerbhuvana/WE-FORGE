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
      return NextResponse.json({ submissions: [], submission: null, limit: 1, remaining: 1, used: 0 });
    }

    // A member may hold several entries in one cycle, so return them all.
    // `submission` stays as the first one for backwards compatibility with any
    // caller that has not moved to the array yet.
    const submissions = await ContestSubmission.find({
      cycleId: cycle._id,
      memberId: actor.id,
    })
      .sort({ entryNumber: 1, submittedAt: 1 })
      .lean();

    const limitRaw = template.maxSubmissionsPerMember;
    const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : 1;
    const used = submissions.length;

    // `remaining` is -1 for unlimited: Infinity is not representable in JSON
    // (it serialises to null and would reach the client as a falsy 0).
    const remaining = limit === 0 ? -1 : Math.max(0, limit - used);

    return NextResponse.json({
      submissions,
      submission: submissions[0] || null,
      limit,
      remaining,
      used,
    });
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

    // How many entries this member already holds in this cycle.
    const existingSubs = await ContestSubmission.find({
      cycleId: cycle._id,
      memberId: actor.id,
    })
      .sort({ entryNumber: 1, submittedAt: 1 })
      .lean();

    const limitRaw = template.maxSubmissionsPerMember;
    const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : 1;

    // Optional `submissionId` in the body means "update this entry".
    // Without it we are adding a new one, which the per-member cap governs.
    const targetId = (req.nextUrl?.searchParams?.get('submissionId')) || null;

    let editing = null;
    if (targetId) {
      editing = existingSubs.find((s) => String(s._id) === String(targetId)) || null;
      if (!editing) {
        return NextResponse.json({ error: 'Submission not found for this cycle' }, { status: 404 });
      }
    } else {
      if (limit > 0 && existingSubs.length >= limit) {
        return NextResponse.json(
          {
            error:
              limit === 1
                ? 'You have already submitted an entry for this cycle'
                : `You have reached the limit of ${limit} entries for this cycle`,
          },
          { status: 400 }
        );
      }
    }

    // Merge newly-uploaded files with the ones already on the entry being
    // edited. A brand-new entry has nothing to merge.
    const previousFiles = Array.isArray(editing?.files) ? editing.files : [];
    const replacedFieldIds = new Set(uploadedFiles.map((f) => f.fieldId));
    const mergedFiles = [
      ...previousFiles.filter((pf) => !replacedFieldIds.has(pf.fieldId)),
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

    let submission;
    if (editing) {
      submission = await ContestSubmission.findByIdAndUpdate(
        editing._id,
        { $set: submissionData },
        { new: true }
      );
    } else {
      submission = await ContestSubmission.create({
        ...submissionData,
        entryNumber: existingSubs.length + 1,
        status: 'submitted',
        submittedAt: new Date(),
      });
    }

    // Refresh cycle counts (new entry, or participant/total changed).
    {
      const subCount = await ContestSubmission.countDocuments({ cycleId: cycle._id });
      const partCount = (await ContestSubmission.distinct('memberId', { cycleId: cycle._id })).length;
      await ContestCycle.findByIdAndUpdate(cycle._id, {
        $set: { submissionCount: subCount, participantCount: partCount }
      });
    }

    const usedNow = await ContestSubmission.countDocuments({ cycleId: cycle._id, memberId: actor.id });
    return NextResponse.json({
      success: true,
      submission,
      limit,
      used: usedNow,
      remaining: limit === 0 ? -1 : Math.max(0, limit - usedNow),
    });
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

    // Withdraw ONE entry. With several entries allowed, `submissionId` selects
    // which one; without it we fall back to the member's most recent entry so the
    // old single-entry client keeps working.
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');

    let filter = { cycleId: cycle._id, memberId: actor.id };
    if (submissionId) {
      filter = { ...filter, _id: submissionId };
    } else {
      const latest = await ContestSubmission.findOne(filter).sort({ entryNumber: -1, submittedAt: -1 }).select('_id');
      if (!latest) return NextResponse.json({ error: 'No submission found to withdraw' }, { status: 404 });
      filter = { ...filter, _id: latest._id };
    }

    const deleted = await ContestSubmission.findOneAndDelete(filter);
    if (!deleted) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

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
