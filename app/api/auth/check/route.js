import { NextResponse } from 'next/server';
import { getActor, isElite, isDomainHead, canAccessAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ authenticated: false });

    if (!canAccessAdmin(actor)) {
        return NextResponse.json({ 
            authenticated: false, 
            signedIn: true, 
            role: actor.role, 
            domain: actor.domain 
        });
    }

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
