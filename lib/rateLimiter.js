import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SystemSettings from '@/lib/models/SystemSettings';

// In-memory sliding window cache for rate limiting
// Map<"actionType:ipOrKey", Array<timestampMs>>
const rateLimitCache = new Map();

// Helper to get client IP address from headers
export function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Fetch or return cached system settings (cached for 10 seconds to maximize performance)
 */
let cachedSettings = null;
let lastFetchTime = 0;

export async function getSystemSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastFetchTime < 10000)) {
    return cachedSettings;
  }

  try {
    await connectDB();
    let settings = await SystemSettings.findOne({ key: 'global_settings' }).lean();
    if (!settings) {
      const doc = await SystemSettings.create({ key: 'global_settings' });
      settings = doc.toObject();
    }
    cachedSettings = settings;
    lastFetchTime = now;
    return settings;
  } catch (err) {
    console.error('Error fetching system settings for rate limiting:', err);
    // Fallback defaults
    return {
      signupsEnabled: true,
      maintenanceMode: false,
      rateLimitingEnabled: true,
      rateLimits: {
        auth: { windowMs: 60000, max: 10 },
        api: { windowMs: 60000, max: 100 },
        upload: { windowMs: 60000, max: 15 },
        certificates: { windowMs: 60000, max: 30 },
      }
    };
  }
}

export function clearSettingsCache() {
  cachedSettings = null;
  lastFetchTime = 0;
}

/**
 * Enforces rate limit for a specific action type ('auth', 'api', 'upload', 'certificates').
 * If rate limiting is disabled globally, allows request.
 * Returns { allowed: boolean, remaining: number, resetMs: number, response?: NextResponse }
 */
export async function checkRateLimit(req, actionType = 'api') {
  const settings = await getSystemSettings();

  // If rate limiting is turned off globally, bypass
  if (!settings.rateLimitingEnabled) {
    return { allowed: true, remaining: 999, resetMs: 0 };
  }

  const limitConfig = settings.rateLimits?.[actionType] || { windowMs: 60000, max: 60 };
  const windowMs = limitConfig.windowMs || 60000;
  const maxRequests = limitConfig.max || 60;

  const ip = getClientIp(req);
  const cacheKey = `${actionType}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = rateLimitCache.get(cacheKey) || [];
  // Filter out timestamps outside current sliding window
  timestamps = timestamps.filter(ts => ts > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const resetMs = oldest + windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      resetMs,
      response: NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded for ${actionType}. Please wait ${Math.ceil(resetMs / 1000)} seconds before trying again.`,
          retryAfter: Math.ceil(resetMs / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(resetMs / 1000)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    };
  }

  // Record this request
  timestamps.push(now);
  rateLimitCache.set(cacheKey, timestamps);

  // Periodically clean up old keys (every 500 requests)
  if (rateLimitCache.size > 2000) {
    for (const [key, tsList] of rateLimitCache.entries()) {
      const valid = tsList.filter(t => t > now - 120000);
      if (valid.length === 0) rateLimitCache.delete(key);
      else rateLimitCache.set(key, valid);
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetMs: windowMs,
  };
}
