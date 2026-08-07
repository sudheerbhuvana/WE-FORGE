import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Registration from "@/lib/models/Registration";
import Event from "@/lib/models/Event";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const registrations = await Registration.find({ email: session.user.email }).lean();
    
    // Enrich with event details
    const enriched = await Promise.all((registrations || []).map(async (reg) => {
      const event = await Event.findOne({ id: reg.eventId }).lean();
      return {
        ...reg,
        eventTitle: event?.title || 'Unknown Event',
        eventDate: event?.eventDate || event?.startTime
      };
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Error in GET /api/members/me/registrations:', err);
    return NextResponse.json([]);
  }
}
