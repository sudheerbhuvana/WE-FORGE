/**
 * permissions.js — Single source of truth for KLFORGE RBAC.
 *
 * Tier system (highest → lowest):
 *   ELITE    → Zero Order / Advisor / Head of Dept / President / Chief Secretary / Treasurer
 *              → can do everything across all domains
 *   HEAD     → Member.isDomainHead === true
 *              → can manage members + events in Member.domain only
 *   NONE     → every other logged-in member
 *              → can only edit their own /api/members/me profile
 *
 * Anything not explicitly granted is denied.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";

export const ELITE_DOMAIN = "Zero Order";
export const ELITE_DOMAINS = [ELITE_DOMAIN, "Advisor"];
export const ELITE_ROLES = [
    "Head of the Department",
    "Alternate Head of Department",
    "President",
    "Chief Secretary",
    "Treasurer",
    "Advisor",
];

export function isElite(member) {
    if (!member) return false;
    if (ELITE_DOMAINS.includes(member.domain)) return true;
    if (ELITE_ROLES.includes(member.role)) return true;
    return false;
}

export function isDomainHead(member) {
    if (!member) return false;
    if (isElite(member)) return true; // elite acts as super-head
    return member.isDomainHead === true;
}

/**
 * Can `actor` see /admin at all?
 */
export function canAccessAdmin(actor) {
    return isElite(actor) || isDomainHead(actor);
}

/**
 * Can `actor` see/manage members within `targetDomain`?
 *  - Elite: yes for any domain
 *  - Domain head: yes only for their own domain
 *  - Anyone else: no
 */
export function canManageDomain(actor, targetDomain) {
    if (!actor) return false;
    if (isElite(actor)) return true;
    if (isDomainHead(actor) && actor.domain === targetDomain) return true;
    return false;
}

/**
 * Per-row gate for member CRUD.
 * Elite can touch anyone. Domain head can touch members in their own domain.
 * Self-edit always allowed (handled by /api/members/me separately).
 */
export function canManageMember(actor, targetMember) {
    if (!actor || !targetMember) return false;
    if (isElite(actor)) return true;
    if (actor.id === targetMember.id) return true; // self via this route
    if (isDomainHead(actor) && actor.domain === targetMember.domain) return true;
    return false;
}

/**
 * Per-row gate for event CRUD. Events don't currently carry a domain; until they do,
 * we treat every event as "domain = creator's domain at create time". For now, the
 * access rule is the simpler: Elite always. Domain head for events whose
 * `event.domain === actor.domain`. Public/private flags are still respected for
 * registration, not for management.
 */
export function canManageEvent(actor, event) {
    if (!actor) return false;
    if (isElite(actor)) return true;
    if (isDomainHead(actor)) {
        if (!event) return true; // creating a new one — allowed (will be tagged with their domain)
        if (event.domain && event.domain === actor.domain) return true;
    }
    return false;
}

export function canCreateEvent(actor) {
    if (!actor) return false;
    return isElite(actor) || isDomainHead(actor);
}

/**
 * Org-wide gates.
 */
export function canManageNotices(actor)  { return isElite(actor); }
export function canManageProjects(actor) { return isElite(actor); }
export function canManageMedia(actor)    { return isElite(actor); }
export function canBulkReorderMembers(actor) { return isElite(actor); }

/**
 * Returns the Member document for the logged-in user, or null.
 * Cached per request via globalThis to avoid duplicate lookups inside
 * one server invocation.
 */
const actorCache = new Map();
export async function getActor() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    if (actorCache.has(session.user.email)) {
        return actorCache.get(session.user.email);
    }

    await connectDB();
    const member = await Member.findOne({ email: session.user.email });
    if (member) actorCache.set(session.user.email, member);
    return member;
}

/**
 * Convenience for API routes: returns { actor } or a NextResponse 401/403.
 * Usage:
 *   const gate = await requirePermission(canManageMember, targetMember);
 *   if (gate.response) return gate.response;
 *   // ... use gate.actor ...
 */
export async function requirePermission(check, ...args) {
    const actor = await getActor();
    if (!actor) {
        return {
            actor: null,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }),
        };
    }
    if (!check(actor, ...args)) {
        return {
            actor,
            response: new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }),
        };
    }
    return { actor, response: null };
}