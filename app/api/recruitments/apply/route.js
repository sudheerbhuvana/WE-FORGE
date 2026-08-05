import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RecruitmentSettings from '@/lib/models/RecruitmentSettings';
import RecruitmentApplication from '@/lib/models/RecruitmentApplication';
import { getActor } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function extractYearFromRoll(rollNumber) {
  if (!rollNumber) return 'Y24';
  const clean = rollNumber.toString().trim();
  const match = clean.match(/^(\d{2})/);
  if (match) {
    return `Y${match[1]}`;
  }
  return 'Y24';
}

export async function GET() {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const application = await RecruitmentApplication.findOne({ memberId: actor.id }).lean();
    const settings = await RecruitmentSettings.findOne().lean();

    return NextResponse.json({
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        rollNumber: actor.rollNumber || actor.id,
        year: extractYearFromRoll(actor.rollNumber || actor.id),
      },
      application: application || null,
      settings: settings || { isOpen: true },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized. Please log in with your KL email.' }, { status: 401 });
  }

  try {
    await connectDB();

    // Check if recruitment is open
    const settings = await RecruitmentSettings.findOne().lean();
    if (settings && settings.isOpen === false) {
      return NextResponse.json({ error: 'Recruitments are currently closed.' }, { status: 400 });
    }

    const body = await req.json();
    const primaryDomain = (body.primaryDomain || '').trim();
    const secondaryDomain = (body.secondaryDomain || '').trim();
    const whyDomain = (body.whyDomain || '').trim();
    const whySecondaryDomain = (body.whySecondaryDomain || '').trim();
    const rawLinks = Array.isArray(body.workLinks) ? body.workLinks : [];

    if (!primaryDomain) {
      return NextResponse.json({ error: 'Primary domain selection is required.' }, { status: 400 });
    }
    if (!whyDomain || whyDomain.length < 10) {
      return NextResponse.json({ error: 'Please explain why you chose your primary domain (min 10 characters).' }, { status: 400 });
    }
    if (secondaryDomain && (!whySecondaryDomain || whySecondaryDomain.length < 10)) {
      return NextResponse.json({ error: 'Please explain why you chose your secondary domain (min 10 characters).' }, { status: 400 });
    }

    const workLinks = rawLinks
      .filter((l) => l && typeof l.url === 'string' && l.url.trim())
      .map((l) => ({
        title: (l.title || 'Work Link').trim().slice(0, 100),
        url: l.url.trim().slice(0, 500),
      }))
      .slice(0, 10);

    const rollNumber = actor.rollNumber || actor.id;
    const year = extractYearFromRoll(rollNumber);

    const applicationData = {
      memberId: actor.id,
      email: actor.email,
      name: actor.name,
      rollNumber,
      year,
      primaryDomain,
      secondaryDomain,
      whyDomain,
      whySecondaryDomain: secondaryDomain ? whySecondaryDomain : '',
      workLinks,
      updatedAt: new Date(),
    };

    const application = await RecruitmentApplication.findOneAndUpdate(
      { memberId: actor.id },
      { 
        $set: applicationData,
        $setOnInsert: { status: 'pending', submittedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, application });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
