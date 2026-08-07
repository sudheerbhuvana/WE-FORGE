/**
 * permissions.js — Single source of truth for KLFORGE RBAC.
 *
 * Permissions are strictly determined by custom roles (Member.customRoleId -> Role.permissions).
 * Anything not explicitly granted by custom permissions is denied.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
import Role from "@/lib/models/Role";

export function isElite(member) {
    if (!member) return false;
    const perms = member.customPermissions || [];
    return perms.includes('*') || perms.includes('all') || perms.includes('super_admin');
}

export function isDomainHead(member) {
    if (!member) return false;
    return isElite(member) || member.isDomainHead === true;
}

export function hasPermission(actor, permKey) {
    if (!actor) return false;
    if (isElite(actor)) return true;
    if (Array.isArray(actor.customPermissions)) {
        return actor.customPermissions.includes(permKey);
    }
    return false;
}

/**
 * Can `actor` see /admin at all?
 */
export function canAccessAdmin(actor) {
    if (!actor) return false;
    if (isElite(actor)) return true;
    if (Array.isArray(actor.customPermissions) && actor.customPermissions.length > 0) return true;
    return false;
}

/**
 * Can `actor` see/manage members within `targetDomain`?
 */
export function canManageDomain(actor, targetDomain) {
    if (!actor) return false;
    if (isElite(actor) || hasPermission(actor, 'members.view_all')) return true;
    return false;
}

/**
 * Per-row gate for member CRUD.
 */
export function canManageMember(actor, targetMember) {
    if (!actor || !targetMember) return false;
    if (isElite(actor)) return true;
    if (actor.id === targetMember.id) return true; // self via this route
    if (hasPermission(actor, 'members.edit_info') || 
        hasPermission(actor, 'members.edit_name') || 
        hasPermission(actor, 'members.edit_email') || 
        hasPermission(actor, 'members.edit_dept') || 
        hasPermission(actor, 'members.edit_roll') ||
        hasPermission(actor, 'members.view_all')) return true;
    return false;
}

export function canManageEvent(actor, event) {
    if (!actor) return false;
    if (isElite(actor) || 
        hasPermission(actor, 'events.edit_info') || 
        hasPermission(actor, 'events.edit_dates') || 
        hasPermission(actor, 'events.publish') ||
        hasPermission(actor, 'events.create')) return true;
    return false;
}

export function canCreateEvent(actor) {
    if (!actor) return false;
    return isElite(actor) || hasPermission(actor, 'events.create');
}

/**
 * Micro-level Org-wide gates strictly checking custom permissions.
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