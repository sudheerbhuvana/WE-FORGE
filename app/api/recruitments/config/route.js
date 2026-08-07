import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RecruitmentSettings from '@/lib/models/RecruitmentSettings';
import { requirePermission, isElite, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    let settings = await RecruitmentSettings.findOne().lean();
    if (!settings) {
      settings = await RecruitmentSettings.create({});
      settings = settings.toObject();
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const { actor, response } = await requirePermission(a => hasPermission(a, 'recruitments.manage_settings'));
  if (response) return response;

  try {
    await connectDB();
    const body = await req.json();

    const patch = {};
    if (typeof body.isOpen === 'boolean') patch.isOpen = body.isOpen;
    if (typeof body.title === 'string') patch.title = body.title.trim();
    if (typeof body.subtitle === 'string') patch.subtitle = body.subtitle.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (typeof body.heroImageUrl === 'string') patch.heroImageUrl = body.heroImageUrl.trim();
    patch.updatedBy = actor.email;
    patch.updatedAt = new Date();

    let settings = await RecruitmentSettings.findOneAndUpdate(
      {},
      { $set: patch },
      { new: true, upsert: true }
    );

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
