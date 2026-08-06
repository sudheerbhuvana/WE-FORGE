import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Member from '@/lib/models/Member';
import { memberSlug, emailLocalPart } from '@/lib/slug';

export const dynamic = 'force-dynamic';

/**
 * GET /api/members/by-slug/[slug]
 *
 * Public. Resolves a URL slug → a single Member document.
 *
 * Tries (in order):
 *   1. `id` field equal to slug
 *   2. `rollNumber` field equal to slug
 *   3. `email` local-part equal to slug (the canonical rule)
 *   4. Legacy `nameToSlug(name)` for old rows that pre-date the email slug rule
 *
 * Returns 404 if no match.
 */
export async function GET(_request, { params }) {
    const { slug } = await params;
    if (!slug) {
        return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    try {
        await connectDB();
        const needle = String(slug).trim();

        const found =
            (await Member.findOne({ username: needle }).lean()) ||
            (await Member.findOne({ id: needle }).lean()) ||
            (await Member.findOne({ rollNumber: needle }).lean()) ||
            (await Member.findOne({ email: `${needle}@kluniversity.in` }).lean());

        if (found) return NextResponse.json(defaults(found));

        // Legacy fallback: name-based slug
        const nameSlug = nameToSlug(needle);
        if (nameSlug) {
            // Look up by exact match, last resort
            const all = await Member.find({}).select('name').lean();
            for (const m of all) {
                if (nameToSlugLocal(m.name) === needle) {
                    const full = await Member.findById(m._id).lean();
                    if (full) return NextResponse.json(defaults(full));
                }
            }
        }

        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function nameToSlug(name) {
    if (!name) return '';
    const parts = name.trim().toLowerCase().split(/\s+/);
    if (parts.length === 1) return parts[0].replace(/[^a-z0-9]/g, '');
    return (parts[0] + parts[1]).replace(/[^a-z0-9]/g, '');
}
function nameToSlugLocal(name) { return nameToSlug(name); }

/** Ensure all the newer optional fields are present (and arrays) in the public response.
 *  Also seed a default KLEF B.Tech entry for the school's list so members
 *  don't have to type it — only when they haven't added any schools yet. */
function defaults(m) {
    const userSchools = m.schools || [];
    return {
        ...m,
        projects:       m.projects       || [],
        achievements:   m.achievements   || [],
        certifications: m.certifications || [],
        cgpas:          m.cgpas          || [],
        schools: userSchools.length > 0 ? userSchools : [{
            _id:        'default-klef',
            level:      'B.Tech',
            name:       'KLEF',
            boardOrUni: 'Koneru Lakshmaiah Education Foundation',
            year:       '',
            createdAt:  new Date(0),
            readonly:   true,
        }],
    };
}
