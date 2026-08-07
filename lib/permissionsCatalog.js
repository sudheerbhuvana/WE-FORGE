/**
 * Ultra-Granular System Permissions Catalog — Defines every micro-action permission in KLFORGE
 */
/**
 * Ultra-Granular System Permissions Catalog — Defines 96 micro-action permissions in KLFORGE
 */
export const PERMISSION_GROUPS = [
  {
    category: 'Members & Profiles',
    description: 'Ultra-fine control over user profiles, identity fields, roles, academics, and status',
    permissions: [
      { id: 'members.view_all', label: 'View All Members', description: 'Can view full directory across all domains' },
      { id: 'members.view_domain', label: 'View Domain Members', description: 'Can view members within assigned domain' },
      { id: 'members.create', label: 'Create Members', description: 'Can create new member profiles' },
      { id: 'members.edit_name', label: 'Edit Member Names', description: 'Can update member full names' },
      { id: 'members.edit_email', label: 'Edit Member Emails', description: 'Can update member email addresses' },
      { id: 'members.edit_roll', label: 'Edit Roll Numbers', description: 'Can modify university roll numbers' },
      { id: 'members.edit_dept', label: 'Edit Department', description: 'Can change member department tags' },
      { id: 'members.edit_domain_role', label: 'Edit Club & Domain Roles', description: 'Can change domain head and club roles' },
      { id: 'members.assign_security_role', label: 'Assign Custom Security Roles', description: 'Can assign custom security roles to user profiles' },
      { id: 'members.edit_academics', label: 'Edit Academic CGPAs & Schools', description: 'Can edit CGPA logs and school records' },
      { id: 'members.edit_socials', label: 'Edit Social Links & Bios', description: 'Can edit GitHub, LinkedIn, Telegram links' },
      { id: 'members.edit_skills', label: 'Edit Skills Tags', description: 'Can modify technical skill tags' },
      { id: 'members.reorder', label: 'Reorder Display Priority', description: 'Can change member ordering index' },
      { id: 'members.suspend', label: 'Suspend / Unsuspend Accounts', description: 'Can freeze or activate member accounts' },
      { id: 'members.delete', label: 'Delete Members', description: 'Can permanently delete member profiles' },
      { id: 'members.export_csv', label: 'Export Member Directory', description: 'Can export member directory as CSV/Excel' },
      { id: 'members.view_sensitive', label: 'View Sensitive Fields', description: 'Can view sensitive identity fields like phone & full CGPA' },
      { id: 'members.bulk_import', label: 'Bulk Import Members', description: 'Can bulk import member profiles from CSV' },
    ]
  },
  {
    category: 'Events & Registrations',
    description: 'Micro-permissions for event creation, registration, attendance, and certificate issuance',
    permissions: [
      { id: 'events.view_public', label: 'View Public Events', description: 'Can view public event listings' },
      { id: 'events.view_internal', label: 'View Draft & Internal Events', description: 'Can view unpublished draft events' },
      { id: 'events.create', label: 'Create Events', description: 'Can draft new events' },
      { id: 'events.edit_info', label: 'Edit Event Info & Descriptions', description: 'Can edit event titles, content, and banners' },
      { id: 'events.edit_dates', label: 'Edit Event Dates & Locations', description: 'Can update timing, venue, or online links' },
      { id: 'events.publish', label: 'Publish / Unpublish Events', description: 'Can make events live or hide them' },
      { id: 'events.registrations_view', label: 'View Event Registrations', description: 'Can view attendee lists' },
      { id: 'events.registrations_edit', label: 'Edit Registrant Details', description: 'Can modify attendee data' },
      { id: 'events.registrations_export', label: 'Export Registrations CSV', description: 'Can download attendee lists as CSV' },
      { id: 'events.attendance_mark', label: 'Mark Attendee Attendance', description: 'Can record or update event attendance status' },
      { id: 'events.certificates_view', label: 'View Event Certificates', description: 'Can view issued certificate records' },
      { id: 'events.certificates_design', label: 'Design Certificate Layouts', description: 'Can position name and roll number coordinates' },
      { id: 'events.certificates_issue', label: 'Issue Certificates', description: 'Can generate certificates for participants' },
      { id: 'events.certificates_download_zip', label: 'Bulk Download Certificate ZIP', description: 'Can download all event certificates as ZIP' },
      { id: 'events.certificates_revoke', label: 'Revoke Certificates', description: 'Can revoke or invalidate issued certificates' },
      { id: 'events.delete', label: 'Delete Events', description: 'Can permanently delete event records' },
      { id: 'events.duplicate', label: 'Duplicate Events', description: 'Can clone existing events as new drafts' },
      { id: 'events.manage_reminders', label: 'Send Event Reminders', description: 'Can broadcast notification reminders to registrants' },
    ]
  },
  {
    category: 'Contests & Competitions',
    description: 'Detailed control over creative and technical contest challenges and grading',
    permissions: [
      { id: 'contests.view', label: 'View Contests', description: 'Can view active and archived contests' },
      { id: 'contests.create', label: 'Create Contests', description: 'Can create new contest challenges' },
      { id: 'contests.edit', label: 'Edit Contest Parameters', description: 'Can edit deadlines, rules, and prizes' },
      { id: 'contests.publish', label: 'Publish / Unpublish Contests', description: 'Can make contests live or hide them' },
      { id: 'contests.submissions_view', label: 'View Submissions', description: 'Can view contestant submissions' },
      { id: 'contests.submissions_download', label: 'Download Submissions', description: 'Can download submission assets' },
      { id: 'contests.submissions_grade', label: 'Grade & Select Winners', description: 'Can mark winning entries' },
      { id: 'contests.announcement_winners', label: 'Announce Contest Champions', description: 'Can publish winner announcements' },
      { id: 'contests.delete', label: 'Delete Contests', description: 'Can delete contest entries' },
      { id: 'contests.export_results', label: 'Export Leaderboard CSV', description: 'Can export contest results as CSV' },
    ]
  },
  {
    category: 'Wall of KL Showcase',
    description: 'Manage featured winning captures, winner badges, author attribution, and ordering',
    permissions: [
      { id: 'wallofkl.view', label: 'View Wall of KL', description: 'Can view public showcase gallery' },
      { id: 'wallofkl.upload', label: 'Upload Winner Photos', description: 'Can upload photos directly to Wall of KL' },
      { id: 'wallofkl.edit_title', label: 'Edit Capture Titles', description: 'Can update image display titles' },
      { id: 'wallofkl.edit_badge', label: 'Edit Winner Badges', description: 'Can update custom pill badge tags' },
      { id: 'wallofkl.edit_author', label: 'Edit Photographer Attribution', description: 'Can set creator/author names' },
      { id: 'wallofkl.reorder', label: 'Reorder Showcase Photos', description: 'Can change display order of photos' },
      { id: 'wallofkl.delete', label: 'Delete Showcase Media', description: 'Can remove photos from Wall of KL' },
      { id: 'wallofkl.feature', label: 'Feature Hero Entry', description: 'Can toggle featured hero badge on photo' },
    ]
  },
  {
    category: 'Projects Showcase',
    description: 'Control organization-wide projects and technical showcases',
    permissions: [
      { id: 'projects.view', label: 'View Projects', description: 'Can view projects list' },
      { id: 'projects.create', label: 'Create Projects', description: 'Can publish new club projects' },
      { id: 'projects.edit', label: 'Edit Projects', description: 'Can update project descriptions, tech stack, and repo links' },
      { id: 'projects.reorder', label: 'Reorder Projects Display', description: 'Can change project display order' },
      { id: 'projects.feature', label: 'Feature Projects', description: 'Can mark project as featured on homepage' },
      { id: 'projects.delete', label: 'Delete Projects', description: 'Can remove project entries' },
    ]
  },
  {
    category: 'Notices & Announcements',
    description: 'Publish and manage club notifications, alerts, and pinning',
    permissions: [
      { id: 'notices.view', label: 'View Notices', description: 'Can view internal notices' },
      { id: 'notices.create', label: 'Post Announcements', description: 'Can post official announcements' },
      { id: 'notices.edit', label: 'Edit Notices', description: 'Can update notice copy and priority' },
      { id: 'notices.pin', label: 'Pin / Unpin Notices', description: 'Can pin notice to top of feed' },
      { id: 'notices.delete', label: 'Delete Notices', description: 'Can remove notices from the feed' },
      { id: 'notices.notify_members', label: 'Broadcast Notifications', description: 'Can trigger email or push broadcasts' },
    ]
  },
  {
    category: 'Media Asset Library',
    description: 'Micro-permissions for R2 cloud storage, asset tagging, and folder management',
    permissions: [
      { id: 'media.view', label: 'View Media Gallery', description: 'Can browse cloud media library' },
      { id: 'media.upload_images', label: 'Upload Images', description: 'Can upload image files' },
      { id: 'media.upload_videos', label: 'Upload Videos', description: 'Can upload video files' },
      { id: 'media.upload_documents', label: 'Upload Documents', description: 'Can upload PDF and document attachments' },
      { id: 'media.create_folders', label: 'Create Media Folders', description: 'Can organize assets into virtual folders' },
      { id: 'media.move', label: 'Move Assets Between Folders', description: 'Can relocate assets into different folders' },
      { id: 'media.rename', label: 'Rename Files & Folders', description: 'Can edit names of files and folders' },
      { id: 'media.star', label: 'Star / Favorite Assets', description: 'Can mark media as favorites' },
      { id: 'media.download', label: 'Download Media Assets', description: 'Can download high-res files' },
      { id: 'media.delete', label: 'Delete Media Assets', description: 'Can permanently delete cloud files' },
    ]
  },
  {
    category: 'Recruitments & Admissions',
    description: 'Control recruitment drives, settings, and applicant evaluations',
    permissions: [
      { id: 'recruitments.view_settings', label: 'View Recruitment Settings', description: 'Can view recruitment configuration' },
      { id: 'recruitments.manage_settings', label: 'Manage Recruitment Settings', description: 'Can open/close drives and edit landing page' },
      { id: 'recruitments.view_applications', label: 'View Applications', description: 'Can review candidate application forms' },
      { id: 'recruitments.edit_application', label: 'Edit Application Details', description: 'Can edit candidate details and notes' },
      { id: 'recruitments.export_applications', label: 'Export Applicant Data', description: 'Can export application data as CSV' },
      { id: 'recruitments.change_app_status', label: 'Update Applicant Status', description: 'Can set status to Accepted, Rejected, or Interview' },
      { id: 'recruitments.schedule_interview', label: 'Schedule Applicant Interviews', description: 'Can assign interview slots to applicants' },
      { id: 'recruitments.delete_applications', label: 'Delete Applications', description: 'Can purge application records' },
    ]
  },
  {
    category: 'Forms & Submissions',
    description: 'Interactive forms builder and response management',
    permissions: [
      { id: 'forms.view', label: 'View Custom Forms', description: 'Can view created forms' },
      { id: 'forms.create', label: 'Create Forms', description: 'Can build new custom forms' },
      { id: 'forms.edit', label: 'Edit Forms', description: 'Can modify form questions and settings' },
      { id: 'forms.view_submissions', label: 'View Submissions', description: 'Can view form responses and entry data' },
      { id: 'forms.export_responses', label: 'Export Responses CSV', description: 'Can export form responses' },
      { id: 'forms.delete', label: 'Delete Forms', description: 'Can delete custom forms' },
    ]
  },
  {
    category: 'Roles & Security RBAC',
    description: 'Ultra-grained administrative authority over custom roles and security policies',
    permissions: [
      { id: 'roles.view', label: 'View Roles & Permissions', description: 'Can view security roles catalog' },
      { id: 'roles.create', label: 'Create Custom Roles', description: 'Can define new custom roles' },
      { id: 'roles.edit_permissions', label: 'Edit Role Permissions', description: 'Can modify micro-permissions attached to any role' },
      { id: 'roles.assign_users', label: 'Assign Roles to Users', description: 'Can assign custom roles to user profiles' },
      { id: 'roles.duplicate', label: 'Duplicate Custom Roles', description: 'Can clone existing custom roles' },
      { id: 'roles.delete', label: 'Delete Custom Roles', description: 'Can delete non-system custom roles' },
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.id));

