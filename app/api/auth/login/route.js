import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({
        error: 'Legacy password login deprecated. Please sign in via Microsoft SSO at /login.'
    }, { status: 400 });
}
