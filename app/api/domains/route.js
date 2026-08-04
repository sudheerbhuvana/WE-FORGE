import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import connectDB from '@/lib/db';
import Domain from '@/lib/models/Domain';

// GET /api/domains — public. Used by member edit form + event admin.
export async function GET() {
    try {
        await connectDB();
        const domains = await Domain.find({ isActive: { $ne: false } })
            .sort({ orderIndex: 1, name: 1 })
            .lean();
        return NextResponse.json(domains);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
