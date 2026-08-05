import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import Member from '@/lib/models/Member';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    const { name, description, permissions, color } = body;

    const role = await Role.findById(id);
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (name && name.trim()) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();
    if (Array.isArray(permissions)) role.permissions = permissions;
    if (color) role.color = color;

    await role.save();

    return NextResponse.json({
      success: true,
      role: {
        ...role.toObject(),
        id: role._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const role = await Role.findById(id);
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ success: false, error: 'Built-in system roles cannot be deleted' }, { status: 400 });
    }

    // Unassign customRoleId from members who had this role
    await Member.updateMany({ customRoleId: id }, { $set: { customRoleId: '' } });

    await Role.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
