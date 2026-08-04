import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Domain from '@/lib/models/Domain';
import { requirePermission, canManageDomain, isEliteByShape } from '@/lib/permissions';
import Member from '@/lib/models/Member';

export const dynamic = 'force-dynamic';

// PUT /api/domains/[id]  — update a domain (color, description, adminRoles)
// Only elite (Zero Order / Advisor / HoD / President / etc.) can edit domains.
export async function PUT(request, { params }) {
    const { response } = await requirePermission(isEliteByShape);
    if (response) return response;

    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const domain = await Domain.findOne({ slug: id });
        if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

        const allowed = ['name', 'description', 'icon', 'color', 'orderIndex', 'isActive', 'adminRoles'];
        for (const key of allowed) {
            if (body[key] !== undefined) domain[key] = body[key];
        }

        await domain.save();
        return NextResponse.json(domain);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET /api/domains/[id]  — public, returns members in this domain (for head-of-domain views)
export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const domain = await Domain.findOne({ slug: id }).lean();
        if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

        const members = await Member.find({ 'roles.domain': domain.name })
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ domain, members });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
