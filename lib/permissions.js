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
    if (isElite(actor)) return true;
    if (actor.id === targetMember.id) return true; // self via this route
    if (isDomainHead(actor) && actor.domain === targetMember.domain) return true;
    if (hasPermission(actor, 'members.edit_name') || hasPermission(actor, 'members.edit_email') || hasPermission(actor, 'members.edit_dept') || hasPermission(actor, 'members.edit_roll')) return true;
    return false;
}

export function canManageEvent(actor, event) {
    if (!actor) return false;
    if (isElite(actor) || hasPermission(actor, 'events.edit_info') || hasPermission(actor, 'events.edit_dates') || hasPermission(actor, 'events.publish')) return true;
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
 * Micro-level Org-wide gates.
 */
export function canManageNotices(actor)  { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('notices.')); }
export function canManageProjects(actor) { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('projects.')); }
export function canManageMedia(actor)    { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('media.')); }
export function canManageWallOfKL(actor) { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('wallofkl.')); }
export function canManageRecruitments(actor) { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('recruitments.')); }
export function canManageForms(actor)    { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('forms.')); }
export function canManageRoles(actor)    { return isElite(actor) || (actor?.customPermissions || []).some(p => p.startsWith('roles.')); }
export function canBulkReorderMembers(actor) { return isElite(actor) || hasPermission(actor, 'members.reorder'); }

/**
 * Returns the Member document for the logged-in user, or null.
 */
export async function getActor() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    await connectDB();
    const member = await Member.findOne({ email: session.user.email }).lean();
    if (!member) return null;

    let customPermissions = [];
    if (member.customRoleId && typeof member.customRoleId === 'string' && member.customRoleId.trim().length > 0) {
        try {
            const role = await Role.findById(member.customRoleId).lean();
            if (role && Array.isArray(role.permissions)) {
                customPermissions = role.permissions;
            }
        } catch (e) {
            console.error('Error fetching member custom role:', e);
        }
    }

    return {
        ...member,
        id: member.id || member._id.toString(),
        customPermissions,
    };
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