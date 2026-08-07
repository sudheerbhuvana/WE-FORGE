import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notice from '@/lib/models/Notice';
import { requirePermission, canManageNotices, isElite, hasPermission } from '@/lib/permissions';

export async function PUT(request, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'notices.edit'));
    if (response) return response;

    try {
        await connectDB();
        const { id } = await params;
        const { title, message, priority } = await request.json();
        
        const updated = await Notice.findOneAndUpdate(
            { id }, 
            { $set: { 
                ...(title && { title: title.trim() }), 
                ...(message && { message: message.trim() }), 
                ...(priority && { priority }) 
            }},
            { new: true }
        );
        
        if (!updated) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'notices.delete'));
    if (response) return response;

    try {
        await connectDB();
        const { id } = await params;
        
        const deleted = await Notice.findOneAndDelete({ id });
        if (!deleted) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
