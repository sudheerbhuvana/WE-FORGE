import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import Member from '@/lib/models/Member';
import { PERMISSION_GROUPS } from '@/lib/permissionsCatalog';

import { requirePermission, isElite } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Seed default system roles if database is empty
async function ensureDefaultRoles() {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.create([
      {
        name: 'Super Admin',
        description: 'Full administrative control over all domains, members, and platform settings',
        permissions: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id)),
        color: '#f59e0b',
        isSystem: true,
      },
      {
        name: 'Domain Head',
        description: 'Can manage members and events within their designated domain',
        permissions: ['members.view', 'members.edit', 'events.view', 'events.create', 'events.edit', 'events.certificates', 'media.view', 'media.upload'],
        color: '#38bdf8',
        isSystem: true,
      },
      {
        name: 'Event Coordinator',
        description: 'Responsible for event planning, logistics, and issuing certificates',
        permissions: ['events.view', 'events.create', 'events.edit', 'events.certificates', 'media.view', 'media.upload'],
        color: '#c084fc',
        isSystem: false,
      },
      {
        name: 'Media & Wall of KL Lead',
        description: 'Manages organization media library and features winning contest captures',
        permissions: ['media.view', 'media.upload', 'media.manage', 'wallofkl.manage', 'contests.view'],
        color: '#34d399',
        isSystem: false,
      }
    ]);
  }
}

export async function GET() {
  try {
    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'roles.view'));
    if (response) return response;

    await connectDB();
    await ensureDefaultRoles();

    const roles = await Role.find({}).lean();
    const members = await Member.find({}, 'customRoleId role').lean();

    // Map member counts to roles
    const rolesWithCounts = roles.map(role => {
      const assignedCount = members.filter(m => String(m.customRoleId) === String(role._id)).length;
      return {
        ...role,
        id: role._id.toString(),
        memberCount: assignedCount,
      };
    });

    return NextResponse.json({
      success: true,
      roles: rolesWithCounts,
      permissionGroups: PERMISSION_GROUPS,
    });
  } catch (error) {
    console.error('Error in /api/roles GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await requirePermission(actor => isElite(actor) || hasPermission(actor, 'roles.create'));
    if (response) return response;

    await connectDB();
    const body = await req.json();

    const { name, description, permissions, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 });
    }

    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 400 });
    }

    const newRole = await Role.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      permissions: Array.isArray(permissions) ? permissions : [],
      color: color || '#71C4FF',
      isSystem: false,
    });

    return NextResponse.json({
      success: true,
      role: {
        ...newRole.toObject(),
        id: newRole._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error in /api/roles POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
