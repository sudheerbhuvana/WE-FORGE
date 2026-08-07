import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
import { saveFile, deleteFile } from '@/lib/uploadHelper';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/members');
const nameToSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const member = await Member.findOne({ email: session.user.email });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const member = await Member.findOne({ email: session.user.email });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      if (formData.has('bio')) member.bio = formData.get('bio').trim();
      if (formData.has('telegram')) member.telegram = formData.get('telegram').trim();
      if (formData.has('github')) member.github = formData.get('github').trim();
      if (formData.has('linkedin')) member.linkedin = formData.get('linkedin').trim();
      if (formData.has('school')) member.school = formData.get('school').trim();

      if (formData.has('skills')) {
        const skillsRaw = formData.get('skills');
        if (typeof skillsRaw === 'string') {
          member.skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      if (formData.has('cgpa')) {
        const c = formData.get('cgpa');
        member.cgpa = (c !== null && c !== undefined && String(c).trim() !== '') ? Number(c) : null;
      }

      const photoFile = formData.get('photo');
      if (photoFile && photoFile.size > 0) {
        if (member.photoUrl) {
          await deleteFile(member.photoUrl, UPLOAD_DIR);
        }
        const slug = nameToSlug(member.name || 'user');
        const buffer = await photoFile.arrayBuffer();
        const ext = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg';
        const filename = `${slug}-${Date.now()}.${ext}`;
        member.photoUrl = await saveFile(buffer, photoFile.type, 'members', UPLOAD_DIR, filename);
      }

      await member.save();
      return NextResponse.json(member);
    } else {
      const body = await request.json();
      const { bio, skills, telegram, github, linkedin, school, cgpa, photoUrl } = body;

      if (bio !== undefined) member.bio = bio;
      if (skills !== undefined) member.skills = skills;
      if (telegram !== undefined) member.telegram = telegram;
      if (github !== undefined) member.github = github;
      if (linkedin !== undefined) member.linkedin = linkedin;
      if (school !== undefined) member.school = school ?? '';
      if (photoUrl !== undefined) member.photoUrl = photoUrl;

      if (cgpa !== undefined) {
        let cgpaValue = null;
        if (cgpa !== null && String(cgpa).trim() !== '') {
          const n = Number(cgpa);
          if (Number.isFinite(n)) cgpaValue = n;
        }
        member.cgpa = cgpaValue;
      }

      await member.save();
      return NextResponse.json(member);
    }
  } catch (err) {
    console.error('Error in PUT /api/members/me:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
