import { NextResponse } from 'next/server';
import { getActor, isElite, isDomainHead } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ authenticated: false });

    return NextResponse.json({
        authenticated: true,
        isElite: isElite(actor),
        isDomainHead: isDomainHead(actor),
        role: actor.role,
        domain: actor.domain,
        memberId: actor.id,
        name: actor.name,
    });
}
