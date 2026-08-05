import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SystemSettings from '@/lib/models/SystemSettings';
import { clearSettingsCache } from '@/lib/rateLimiter';

import { requirePermission, isElite } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await SystemSettings.create({ key: 'global_settings' });
    }

    return NextResponse.json({
      success: true,
      settings: settings.toObject(),
    });
  } catch (error) {
    console.error('Error in /api/system/settings GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const gate = await requirePermission(isElite);
    if (gate.response) return gate.response;

    await connectDB();
    const body = await req.json();

    const {
      signupsEnabled,
      maintenanceMode,
      rateLimitingEnabled,
      rateLimits,
      maintenanceMessage,
    } = body;

    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = new SystemSettings({ key: 'global_settings' });
    }

    if (typeof signupsEnabled === 'boolean') settings.signupsEnabled = signupsEnabled;
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (typeof rateLimitingEnabled === 'boolean') settings.rateLimitingEnabled = rateLimitingEnabled;

    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;

    if (rateLimits) {
      if (rateLimits.auth) {
        if (rateLimits.auth.max !== undefined) settings.rateLimits.auth.max = Number(rateLimits.auth.max);
        if (rateLimits.auth.windowMs !== undefined) settings.rateLimits.auth.windowMs = Number(rateLimits.auth.windowMs);
      }
      if (rateLimits.api) {
        if (rateLimits.api.max !== undefined) settings.rateLimits.api.max = Number(rateLimits.api.max);
        if (rateLimits.api.windowMs !== undefined) settings.rateLimits.api.windowMs = Number(rateLimits.api.windowMs);
      }
      if (rateLimits.upload) {
        if (rateLimits.upload.max !== undefined) settings.rateLimits.upload.max = Number(rateLimits.upload.max);
        if (rateLimits.upload.windowMs !== undefined) settings.rateLimits.upload.windowMs = Number(rateLimits.upload.windowMs);
      }
      if (rateLimits.certificates) {
        if (rateLimits.certificates.max !== undefined) settings.rateLimits.certificates.max = Number(rateLimits.certificates.max);
        if (rateLimits.certificates.windowMs !== undefined) settings.rateLimits.certificates.windowMs = Number(rateLimits.certificates.windowMs);
      }
    }

    settings.updatedAt = new Date();
    await settings.save();

    // Invalidate local in-memory settings cache
    clearSettingsCache();

    return NextResponse.json({
      success: true,
      settings: settings.toObject(),
      message: 'System settings updated successfully',
    });
  } catch (error) {
    console.error('Error in /api/system/settings PUT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
