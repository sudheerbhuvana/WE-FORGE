import { NextResponse } from 'next/server';
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
import { requirePermission, canBulkReorderMembers } from "@/lib/permissions";

export async function POST(req) {
  const { response } = await requirePermission(canBulkReorderMembers);
  if (response) return response;

  try {
    const { updates } = await req.json();
    await connectDB();

    const bulkOps = updates.map(u => ({
      updateOne: {
        filter: { id: u.id },
        update: { $set: { orderIndex: u.orderIndex } }
      }
    }));

    await Member.bulkWrite(bulkOps);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
