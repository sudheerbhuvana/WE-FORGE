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
import Role from "@/lib/models/Role";

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

export function hasPermission(actor, permKey) {
    if (!actor) return false;
    if (isElite(actor)) return true;
    if (actor.customPermissions && Array.isArray(actor.customPermissions)) {
        return actor.customPermissions.includes(permKey);
    }
    return false;
}

/**
 * Can `actor` see /admin at all?
 */
export function canAccessAdmin(actor) {
    if (!actor) return false;
    if (isElite(actor) || isDomainHead(actor)) return true;
    if (actor.customPermissions && actor.customPermissions.length > 0) return true;
    return false;
}

/**
 * Can `actor` see/manage members within `targetDomain`?
 */
export function canManageDomain(actor, targetDomain) {
    if (!actor) return false;
    if (isElite(actor) || hasPermission(actor, 'members.view_all')) return true;
    if (isDomainHead(actor) && actor.domain === targetDomain) return true;
    return false;
}

/**
 * Per-row gate for member CRUD.
 */
export function canManageMember(actor, targetMember) {
    if (!actor || !targetMember) return false;
    if (isElite(actor) || hasPermission(actor, 'members.edit_profile')) return true;
    if (actor.id === targetMember.id) return true; // self via this route
    if (isDomainHead(actor) && actor.domain === targetMember.domain) return true;
    return false;
}

export function canManageEvent(actor, event) {
    if (!actor) return false;
    if (isElite(actor) || hasPermission(actor, 'events.edit_info')) return true;
    if (isDomainHead(actor)) {
        if (!event) return true;
        if (event.domain && event.domain === actor.domain) return true;
    }
    return false;
}

export function canCreateEvent(actor) {
    if (!actor) return false;
    return isElite(actor) || isDomainHead(actor) || hasPermission(actor, 'events.create');
}

/**
 * Org-wide gates.
 */
export function canManageNotices(actor)  { return isElite(actor) || hasPermission(actor, 'notices.manage') || hasPermission(actor, 'notices.create'); }
export function canManageProjects(actor) { return isElite(actor) || hasPermission(actor, 'projects.manage') || hasPermission(actor, 'projects.create'); }
export function canManageMedia(actor)    { return isElite(actor) || hasPermission(actor, 'media.manage') || hasPermission(actor, 'media.upload_images'); }
export function canManageWallOfKL(actor) { return isElite(actor) || hasPermission(actor, 'wallofkl.upload') || hasPermission(actor, 'wallofkl.edit_metadata'); }
export function canBulkReorderMembers(actor) { return isElite(actor) || hasPermission(actor, 'members.reorder'); }

/**
 * Returns the Member document for the logged-in user, or null.
 */
const actorCache = new Map();
export async function getActor() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    if (actorCache.has(session.user.email)) {
        return actorCache.get(session.user.email);
    }

    await connectDB();
    const member = await Member.findOne({ email: session.user.email }).lean();
    if (!member) return null;

    let customPermissions = [];
    if (member.customRoleId) {
        try {
            const role = await Role.findById(member.customRoleId).lean();
            if (role && Array.isArray(role.permissions)) {
                customPermissions = role.permissions;
            }
        } catch (e) {
            console.error('Error fetching member custom role:', e);
        }
    }

    const actor = {
        ...member,
        id: member.id || member._id.toString(),
        customPermissions,
    };

    actorCache.set(session.user.email, actor);
    return actor;
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