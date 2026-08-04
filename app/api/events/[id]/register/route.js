import { NextResponse } from 'next/server';
import path from 'path';
import connectDB from '@/lib/db';
import Event from '@/lib/models/Event';
import Registration from '@/lib/models/Registration';
import { saveFile } from '@/lib/uploadHelper';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/registrations');

const isFile = (v) => v && typeof v === 'object' && typeof v.arrayBuffer === 'function';

const safeStr = (v) => (typeof v === 'string' ? v.trim() : '');

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return await request.formData();
  }
  if (contentType.includes('application/json')) {
    const json = await request.json();
    const fd = new FormData();
    Object.entries(json).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
    return fd;
  }
  // Fallback: try formData
  return await request.formData();
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const formData = await readBody(request);

    const name = safeStr(formData.get('name'));
    const rollNumber = safeStr(formData.get('rollNumber'));
    const email = safeStr(formData.get('email'));

    if (!name || !rollNumber || !email) {
      return NextResponse.json({ error: 'Name, roll number and email are required' }, { status: 400 });
    }

    const event = await Event.findOne({ id });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Access Control
    if (event.accessType === 'domain' || event.accessType === 'private') {
      const { default: Member } = await import('@/lib/models/Member');
      const memberDoc = await Member.findOne({ rollNumber: new RegExp(`^${rollNumber.trim()}$`, 'i') });
      if (!memberDoc) {
        return NextResponse.json({ error: 'You must be a registered KLFORGE member to access this event' }, { status: 403 });
      }
      if (event.accessType === 'domain') {
        const userClubDomain = memberDoc.domain;
        if (!event.allowedDomains.includes(userClubDomain)) {
          return NextResponse.json({ error: `This event is restricted to: ${event.allowedDomains.join(', ')}` }, { status: 403 });
        }
      } else if (event.accessType === 'private') {
        if (!event.allowedMembers.includes(rollNumber.trim()) && !event.allowedMembers.includes(Number(rollNumber.trim()))) {
          return NextResponse.json({ error: 'You are not on the guest list for this private event' }, { status: 403 });
        }
      }
    }

    if (!event.isRegistrationOpen) {
      return NextResponse.json({ error: 'Registration is currently closed' }, { status: 400 });
    }
    if (new Date(event.registrationDeadline) < new Date()) {
      return NextResponse.json({ error: 'Registration deadline passed' }, { status: 400 });
    }
    if (event.registeredCount >= event.slots) {
      return NextResponse.json({ error: 'No slots remaining' }, { status: 400 });
    }
    const duplicate = await Registration.findOne({ eventId: event.id, rollNumber: new RegExp(`^${rollNumber.trim()}$`, 'i') });
    if (duplicate) return NextResponse.json({ error: 'Already registered' }, { status: 409 });

    // Build customAnswers from event.customFields definition + formData
    const customAnswers = [];
    const fields = Array.isArray(event.customFields) ? event.customFields : [];
    for (const f of fields) {
      const raw = formData.get(`field_${f.id}`);
      const fileRaw = formData.getAll(`field_${f.id}_file`);
      const linkRaw = formData.get(`field_${f.id}_links`);

      const answer = { fieldId: f.id, label: f.label, type: f.type, value: undefined };

      if (f.type === 'image' || f.type === 'video' || f.type === 'file') {
        // File uploads
        const files = [];
        for (const file of fileRaw) {
          if (!isFile(file) || (file.size || 0) <= 0) continue;
          const maxMB = f.maxSizeMB || 10;
          if (file.size > maxMB * 1024 * 1024) {
            return NextResponse.json({ error: `${f.label}: file exceeds ${maxMB}MB limit` }, { status: 400 });
          }
          const buffer = await file.arrayBuffer();
          const ext = (file.type || '').includes('png') ? 'png'
            : (file.type || '').includes('webp') ? 'webp'
            : (file.type || '').includes('pdf') ? 'pdf'
            : ((file.name || '').split('.').pop() || 'bin').toLowerCase();
          const safeName = `${id}-${f.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const url = await saveFile(buffer, file.type || 'application/octet-stream', 'registrations', UPLOAD_DIR, safeName);
          files.push({
            fieldId: f.id,
            fieldLabel: f.label,
            fieldType: f.type,
            url,
            s3Key: '',
            mimeType: file.type || '',
            fileSize: file.size,
            originalName: file.name || safeName,
          });
        }
        if (f.required && files.length === 0) {
          return NextResponse.json({ error: `${f.label} is required` }, { status: 400 });
        }
        answer.files = files;
      } else if (f.type === 'link') {
        // JSON-encoded array of { title, url }
        let links = [];
        try {
          if (linkRaw) links = JSON.parse(linkRaw);
        } catch {
          links = [];
        }
        if (f.required && (!Array.isArray(links) || links.length === 0)) {
          return NextResponse.json({ error: `${f.label} is required` }, { status: 400 });
        }
        answer.workLinks = links;
      } else {
        // text / textarea / number / email / select
        const value = safeStr(raw);
        if (f.required && !value) {
          return NextResponse.json({ error: `${f.label} is required` }, { status: 400 });
        }
        if (f.type === 'select' && value && Array.isArray(f.options) && f.options.length > 0 && !f.options.includes(value)) {
          return NextResponse.json({ error: `${f.label}: invalid selection` }, { status: 400 });
        }
        answer.value = value;
      }

      // Only push if anything meaningful was provided OR the field is required
      const hasValue =
        (answer.value !== undefined && answer.value !== '') ||
        (Array.isArray(answer.files) && answer.files.length > 0) ||
        (Array.isArray(answer.workLinks) && answer.workLinks.length > 0);
      if (hasValue || f.required) customAnswers.push(answer);
    }

    const newReg = new Registration({
      id: String(Date.now()),
      eventId: event.id,
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: email.trim(),
      customAnswers,
    });

    await newReg.save();

    event.registeredCount += 1;
    await event.save();

    return NextResponse.json({ success: true, registration: newReg }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
