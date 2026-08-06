import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
const { uploadToR2, isR2Configured } = require('@/lib/r2');

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

    const contentType = request.headers.get('content-type') || '';
    let updateFields = {};

    if (contentType.includes('multipart/form-data')) {
      // Handle form data (includes potential photo upload)
      const formData = await request.formData();
      const bio = formData.get('bio');
      const skills = formData.get('skills');
      const telegram = formData.get('telegram');
      const github = formData.get('github');
      const linkedin = formData.get('linkedin');
      const department = formData.get('department');
      const branch = formData.get('branch');
      const removePhoto = formData.get('removePhoto');
      const photoFile = formData.get('photo');

      if (bio !== null) updateFields.bio = bio;
      if (skills !== null) updateFields.skills = skills ? JSON.parse(skills) : [];
      if (telegram !== null) updateFields.telegram = telegram;
      if (github !== null) updateFields.github = github;
      if (linkedin !== null) updateFields.linkedin = linkedin;
      if (department !== null) updateFields.department = department.trim();
      if (branch !== null) updateFields.branch = branch.trim();
      const usernameFormVal = formData.get('username');
      if (usernameFormVal !== null && usernameFormVal.trim()) {
        updateFields.username = usernameFormVal.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      }

      if (removePhoto === 'true') {
        updateFields.photoUrl = '';
      } else if (photoFile && photoFile.size > 0) {
        if (!isR2Configured()) {
          return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
        }
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const key = `avatars/${session.user.email.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`;
        const photoUrl = await uploadToR2(buffer, key, photoFile.type || 'image/jpeg');
        updateFields.photoUrl = photoUrl;
      }
    } else {
      // JSON body (existing behaviour)
      const body = await request.json();
      console.log('[API ME PUT] body:', body);
      const { bio, skills, telegram, github, linkedin, department, branch, username: usernameVal } = body;
      if (bio !== undefined) updateFields.bio = bio;
      if (skills !== undefined) updateFields.skills = skills;
      if (telegram !== undefined) updateFields.telegram = telegram;
      if (github !== undefined) updateFields.github = github;
      if (linkedin !== undefined) updateFields.linkedin = linkedin;
      if (department !== undefined) updateFields.department = department.trim();
      if (branch !== undefined) updateFields.branch = branch.trim();
      if (usernameVal !== undefined && usernameVal.trim()) {
        const sanitized = usernameVal.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (sanitized.length >= 3) {
          // Check uniqueness
          const existing = await Member.findOne({ username: sanitized, email: { $ne: session.user.email } }).lean();
          if (existing) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
          }
          updateFields.username = sanitized;
        }
      }
    }

    const member = await Member.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateFields },
      { new: true }
    );
    return NextResponse.json(member);
  } catch (err) {
    console.error('[API ME PUT] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
