import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notice from '@/lib/models/Notice';
import { requirePermission, canManageNotices, isElite, hasPermission } from '@/lib/permissions';

export async function GET() {
    try {
        await connectDB();
        const notices = await Notice.find().sort({ createdAt: -1 });
        return NextResponse.json(notices);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const { actor, response } = await requirePermission(a => isElite(a) || hasPermission(a, 'notices.create'));
    if (response) return response;

    try {
        await connectDB();
        const { title, message, priority, notifyMembers } = await request.json();
        
        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        if (notifyMembers && !isElite(actor) && !hasPermission(actor, 'notices.notify_members')) {
            return NextResponse.json({ error: 'Forbidden: Missing notices.notify_members permission' }, { status: 403 });
        }
        
        const newNotice = new Notice({
            id: String(Date.now()),
            title: title.trim(),
            message: message.trim(),
            priority: priority || 'low',
        });
        
        await newNotice.save();
        return NextResponse.json(newNotice, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
