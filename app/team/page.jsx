import React from "react";
import ExpandableCard from "../../src/components/ExpandableCard";
import connectDB from "@/lib/db";
import Member from "@/lib/models/Member";
import "./page.css";

export const dynamic = 'force-dynamic';

const ROLE_WEIGHTS = {
  'Head of the Department': 1,
  'Alternate Head of Department': 2,
  'President': 3,
  'Chief Secretary': 4,
  'Treasurer': 5,
  'Advisor': 6,
  'Chief': 10,
  'Lead': 20,
  'Core Member': 30,
  'Associate': 40,
  'Speaker': 50,
  'Member': 90,
  'Student': 100,
  'General': 100
};

// Only these domains are shown on the team page — no General
const DOMAIN_ORDER = [
  'Zero Order',
  'Technical',
  'Media & Broadcasting',
  'Operations & Protocol',
  'Creative & Content',
  'Advisors',
  'Public Speaking',
  'Tech & Innovation',
  'Protocol & Operations',
  'Advisor',
  'General',
];

export default async function TeamPage() {
  await connectDB();
  const membersData = await Member.find({ isSuspended: { $ne: true } }).lean();

  // Group members into domain buckets (supporting primary domain + additional roles array)
  const grouped = {};

  for (const m of membersData) {
    const memberObj = {
      name: m.name,
      description: m.bio || m.description || 'No description provided.',
      profileLink: `/${m.id}`,
      color: m.color || '#71C4FF',
      rawRole: m.role || 'Student',
      role: `${m.role || 'Member'}  •  ${m.rollNumber || ''}`,
    };

    // Primary domain assignment
    const primaryDomain = m.domain || 'General';
    if (!grouped[primaryDomain]) grouped[primaryDomain] = [];
    grouped[primaryDomain].push(memberObj);

    // Additional domain roles if present
    if (Array.isArray(m.roles)) {
      for (const r of m.roles) {
        if (r.domain && r.domain !== primaryDomain) {
          if (!grouped[r.domain]) grouped[r.domain] = [];
          grouped[r.domain].push({
            ...memberObj,
            rawRole: r.role || m.role,
            role: `${r.role || m.role}  •  ${m.rollNumber || ''}`,
          });
        }
      }
    }
  }

  // Sort members within each domain by hierarchy role weight
  for (const domain in grouped) {
    grouped[domain].sort((a, b) => {
      const wA = ROLE_WEIGHTS[a.rawRole] ?? 1000;
      const wB = ROLE_WEIGHTS[b.rawRole] ?? 1000;
      if (wA !== wB) return wA - wB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // Build ordered list of domain sections
  const orderedEntries = [];
  const processedDomains = new Set();

  for (const domain of DOMAIN_ORDER) {
    if (grouped[domain] && grouped[domain].length > 0) {
      orderedEntries.push([domain, grouped[domain]]);
      processedDomains.add(domain);
    }
  }

  // Include any remaining custom domains dynamically
  for (const domain of Object.keys(grouped)) {
    if (!processedDomains.has(domain) && grouped[domain].length > 0) {
      orderedEntries.push([domain, grouped[domain]]);
    }
  }

  return (
    <div className="team-page">
      <div className="team-page__header">
        <h1 className="team-page__title">Our Team</h1>
        <p className="team-page__subtitle">
          Click on a member to learn more about them
        </p>
      </div>

      <div className="team-page__content">
        {orderedEntries.length > 0 ? (
          orderedEntries.map(([domain, cards]) => (
            <div key={domain} className="team-page__domain-section">
              <h2 className="team-page__domain-title">
                {domain}
              </h2>
              <div className="team-page__cards">
                <ExpandableCard cards={cards} />
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No team members found.</p>
        )}
      </div>
    </div>
  );
}
