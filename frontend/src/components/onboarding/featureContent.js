import {
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Flame,
  Layers,
  MapPin,
  Merge,
  Sparkles,
  Users,
} from 'lucide-react';

export const roleSteps = {
  resident: [
    {
      title: 'Report infrastructure issues',
      blurb: 'Create a report with a photo, description, location and category. Reports are submitted for the CivicPulse team to review.',
      bullets: ['Capture or upload a photo', 'Describe the issue and location', 'Choose the relevant category'],
      icon: FileText,
    },
    {
      title: 'AI-assisted classification',
      blurb: 'Image analysis can suggest a category such as garbage, pothole, streetlight or water leak. A human verifier reviews the report; AI does not make the final decision.',
      bullets: ['Review the suggested category', 'Human verification remains in control', 'Suggestions can be corrected'],
      icon: Sparkles,
    },
    {
      title: 'Duplicates, tracking and updates',
      blurb: 'Similar reports are surfaced to verifiers for review, not automatically rejected. Follow reports and monitor their status from My Reports and Notifications.',
      bullets: ['Follow reports that matter to you', 'Check status changes in My Reports', 'Receive report and merge updates'],
      icon: Merge,
    },
  ],
  verifier: [
    {
      title: 'Review and classify reports',
      blurb: 'Inspect submitted information and photos, validate the report and review AI category suggestions before deciding what happens next.',
      bullets: ['Validate report details and location', 'Confirm or correct AI suggestions', 'Reject a report with a reason'],
      icon: ClipboardCheck,
    },
    {
      title: 'Review possible duplicates',
      blurb: 'Compare suggested matches, merge reports that cover the same issue, or unmerge a report if a merge was incorrect.',
      bullets: ['Review similarity suggestions', 'Merge reports when appropriate', 'Reverse an incorrect merge'],
      icon: Merge,
    },
  ],
  authority: [
    {
      title: 'Manage your assigned work',
      blurb: 'Review reports assigned to your account and keep residents informed by advancing work through the available statuses.',
      bullets: ['See assigned infrastructure issues', 'Update progress and status', 'Record resolution details'],
      icon: FileText,
    },
  ],
  admin: [
    {
      title: 'Manage users and assignments',
      blurb: 'Manage user roles and assign reports to authority users from the administration dashboard.',
      bullets: ['Review users and update roles', 'Assign reports and due dates', 'Monitor report queues'],
      icon: Users,
    },
    {
      title: 'Manage categories, wards and hotspots',
      blurb: 'Maintain the platform reference data and refresh hotspot analysis from the admin dashboard.',
      bullets: ['Add issue categories and wards', 'Review platform-wide activity', 'Recompute hotspots and view analytics'],
      icon: Layers,
    },
  ],
};

const feature = (name, description, howTo, icon, to) => ({
  name,
  description,
  howTo,
  icon,
  to,
});

export const roleFeatureGuides = {
  resident: [
    feature('Report an issue', 'Submit an infrastructure report with its category, location, description and photo.', 'Choose Report from navigation and complete the issue form.', FileText, '/report/new'),
    feature('AI-assisted classification', 'Review the model suggestion for garbage, pothole, streetlight or water leak; a verifier makes the final decision.', 'After submitting a report, check its suggested category in report details.', Sparkles, '/my-reports'),
    feature('Follow and track reports', 'See your reports, follow relevant issues and monitor status changes.', 'Open My Reports to view your submissions and report details.', CheckCircle2, '/my-reports'),
    feature('Notifications', 'Receive updates about reports you submit or follow, including merge and status updates.', 'Open Notifications to review updates and mark them read.', BellRing, '/notifications'),
    feature('Community map', 'Browse reports on the community map. Hotspot analytics are not available to resident accounts.', 'Choose Map from navigation to explore reports.', MapPin, '/community-map'),
  ],
  verifier: [
    feature('Verification queue', 'Review report details and photos, update classifications, reject invalid reports and inspect possible duplicates.', 'Open the verification queue, select a report, then use its review actions.', ClipboardCheck, '/verifier/queue'),
    feature('Duplicate review', 'Compare potential matches and merge duplicate reports; unmerge them if the match is incorrect.', 'Select a report in the verification queue and review its duplicate suggestions.', Merge, '/verifier/queue'),
    feature('Notifications', 'Receive updates relevant to reports you submitted or follow.', 'Open Notifications to review updates.', BellRing, '/notifications'),
  ],
  authority: [
    feature('Assigned reports', 'View issues assigned to you and update work status as field progress changes.', 'Open Assigned Work to review and update your reports.', FileText, '/authority/assigned'),
    feature('Notifications', 'Receive updates relevant to reports you submitted or follow.', 'Open Notifications to review updates.', BellRing, '/notifications'),
  ],
  admin: [
    feature('User and role management', 'Review users and assign supported platform roles.', 'Open Admin and choose the Users section.', Users, '/admin?tab=users'),
    feature('Report assignment', 'Assign reports to authority users and set due dates.', 'Open Admin and use the report assignment action.', FileText, '/admin?tab=reports'),
    feature('Categories and wards', 'Maintain the categories and wards used across reports.', 'Open Admin and select Categories or Wards.', Layers, '/admin?tab=areas'),
    feature('Analytics and hotspots', 'Review system-wide reporting, inspect hotspot clusters and recompute hotspot analysis.', 'Open Analytics to review trends and refresh hotspot data.', Flame, '/analytics'),
  ],
};
