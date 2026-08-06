import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContestTemplate from '@/lib/models/ContestTemplate';
import ContestCycle from '@/lib/models/ContestCycle';
import { ensureActiveCycle } from '@/lib/contestEngine';
import { requirePermission, canManageEvent } from '@/lib/permissions';
import { memberSlug } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const query = { isPublished: true };
    if (typeFilter && typeFilter !== 'all') {
      query.type = typeFilter;
    }

    const templates = await ContestTemplate.find(query).sort({ featured: -1, createdAt: -1 }).lean();

    // Attach active cycle data to each template
    const items = await Promise.all(
      templates.map(async (tmpl) => {
        const activeCycle = await ensureActiveCycle(tmpl);
        return {
          ...tmpl,
          activeCycle: activeCycle ? activeCycle.toObject ? activeCycle.toObject() : activeCycle : null,
        };
      })
    );

    let filtered = items;
    if (statusFilter && statusFilter !== 'all') {
      filtered = items.filter(i => i.activeCycle && i.activeCycle.status === statusFilter);
    }

    if (search) {
      filtered = filtered.filter(i => 
        (i.title || '').toLowerCase().includes(search) ||
        (i.description || '').toLowerCase().includes(search) ||
        (i.slug || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'contests.create'));
  if (response) return response;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Contest title is required' }, { status: 400 });
    }

    const rawSlug = body.slug || body.title;
    let slug = memberSlug({ email: `${rawSlug}@kl.in` }).replace(/[^a-z0-9-]/g, '');
    if (!slug) slug = `contest-${Date.now()}`;

    // Check slug uniqueness
    const existing = await ContestTemplate.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const templateData = {
      slug,
      title: body.title.trim(),
      description: (body.description || '').trim(),
      type: body.type || 'one_time',
      bannerUrl: (body.bannerUrl || '').trim(),
      rules: (body.rules || '').trim(),
      eligibility: (body.eligibility || 'Open to all KL University students.').trim(),
      submissionGuidelines: (body.submissionGuidelines || '').trim(),
      prizeInfo: (body.prizeInfo || '').trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      visibility: body.visibility || 'public',
      featured: !!body.featured,
      schedule: body.schedule || {},
      customFields: Array.isArray(body.customFields) ? body.customFields : [],
      isPublished: body.isPublished !== false,
      createdBy: actor.email,
    };

    const template = await ContestTemplate.create(templateData);

    // Generate first cycle immediately
    const activeCycle = await ensureActiveCycle(template);

    return NextResponse.json({
      success: true,
      template,
      activeCycle,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
