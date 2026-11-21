import {
  Briefcase,
  Cake,
  GraduationCap,
  Heart,
  Landmark,
  Mic2,
  PartyPopper,
  Send,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';

export const EVENT_CATEGORIES = [
  {
    value: 'wedding',
    label: 'Wedding',
    icon: Heart,
    gradient: 'from-rose-500/35 via-fuchsia-500/20 to-purple-700/35',
    tint: 'text-rose-300',
    accent: '#FB7185',
  },
  {
    value: 'engagement',
    label: 'Engagement',
    icon: Sparkles,
    gradient: 'from-pink-500/30 via-rose-400/15 to-amber-500/25',
    tint: 'text-pink-300',
    accent: '#F472B6',
  },
  {
    value: 'birthday',
    label: 'Birthday',
    icon: Cake,
    gradient: 'from-amber-400/30 via-orange-500/15 to-rose-500/30',
    tint: 'text-amber-300',
    accent: '#FBBF24',
  },
  {
    value: 'graduation',
    label: 'Graduation',
    icon: GraduationCap,
    gradient: 'from-sky-500/30 via-cyan-400/15 to-blue-700/30',
    tint: 'text-sky-300',
    accent: '#38BDF8',
  },
  {
    value: 'conference',
    label: 'Business Conference',
    icon: Briefcase,
    gradient: 'from-indigo-500/30 via-violet-500/15 to-slate-600/30',
    tint: 'text-indigo-300',
    accent: '#818CF8',
  },
  {
    value: 'gala',
    label: 'Corporate Gala',
    icon: Landmark,
    gradient: 'from-yellow-500/25 via-amber-500/10 to-slate-700/40',
    tint: 'text-gold',
    accent: '#F5C870',
  },
  {
    value: 'kitchen-party',
    label: 'Kitchen Party',
    icon: UtensilsCrossed,
    gradient: 'from-emerald-500/30 via-teal-500/15 to-cyan-600/25',
    tint: 'text-emerald-300',
    accent: '#34D399',
  },
  {
    value: 'send-off',
    label: 'Send-off',
    icon: Send,
    gradient: 'from-teal-500/30 via-sky-500/15 to-indigo-600/25',
    tint: 'text-teal-300',
    accent: '#2DD4BF',
  },
  {
    value: 'seminar',
    label: 'Seminar',
    icon: Mic2,
    gradient: 'from-violet-500/30 via-purple-500/15 to-slate-700/30',
    tint: 'text-violet-300',
    accent: '#A78BFA',
  },
  {
    value: 'other',
    label: 'Other Celebration',
    icon: PartyPopper,
    gradient: 'from-slate-400/25 via-slate-500/10 to-slate-700/35',
    tint: 'text-slate-300',
    accent: '#94A3B8',
  },
];

export const categoryByValue = (value) =>
  EVENT_CATEGORIES.find((category) => category.value === value) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];

export const E_CARD_TEMPLATES = [
  {
    id: 'noir',
    name: 'Midnight Noir',
    bg_color: '#0B1120',
    accent_color: '#C084FC',
    text_color: '#F8FAFC',
  },
  {
    id: 'ivory',
    name: 'Ivory Atelier',
    bg_color: '#F5EFE4',
    accent_color: '#A16207',
    text_color: '#292524',
  },
  {
    id: 'emerald',
    name: 'Emerald Court',
    bg_color: '#052E2B',
    accent_color: '#6EE7B7',
    text_color: '#ECFDF5',
  },
  {
    id: 'terracotta',
    name: 'Terracotta Sun',
    bg_color: '#2B1210',
    accent_color: '#FB923C',
    text_color: '#FFF7ED',
  },
  {
    id: 'royal',
    name: 'Royal Sapphire',
    bg_color: '#0F1B4D',
    accent_color: '#F5C870',
    text_color: '#F8FAFC',
  },
];

export const DEFAULT_ECARD = {
  template: 'noir',
  bg_color: '#0B1120',
  accent_color: '#C084FC',
  text_color: '#F8FAFC',
  name_y: 58,
  qr_position: 'bottom-center',
  qr_size: 132,
};

export const QR_POSITIONS = [
  { value: 'bottom-left', label: 'Left' },
  { value: 'bottom-center', label: 'Center' },
  { value: 'bottom-right', label: 'Right' },
];

export const GUEST_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'slate' },
  { value: 'sent', label: 'Invited', tone: 'sky' },
  { value: 'checked_in', label: 'Checked in', tone: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', tone: 'rose' },
];

export const statusMeta = (value) =>
  GUEST_STATUSES.find((status) => status.value === value) ?? GUEST_STATUSES[0];

export const CARD_TYPES = [
  { value: 'single', label: 'Single', shortLabel: 'Single', attendees: 1, tone: 'slate' },
  { value: 'double', label: 'Double (couple)', shortLabel: 'Double', attendees: 2, tone: 'sky' },
  { value: 'group', label: 'Group', shortLabel: 'Group', attendees: null, tone: 'violet' },
  { value: 'vip', label: 'VIP', shortLabel: 'VIP', attendees: 1, tone: 'gold' },
];

export const cardTypeMeta = (value) =>
  CARD_TYPES.find((type) => type.value === value) ?? CARD_TYPES[0];

export const CONFIRMATION_STATUSES = [
  { value: 'pending', label: 'Awaiting RSVP', shortLabel: 'Pending', tone: 'slate' },
  { value: 'confirmed', label: 'Confirmed', shortLabel: 'Confirmed', tone: 'emerald' },
  { value: 'declined', label: 'Declined', shortLabel: 'Declined', tone: 'rose' },
];

export const confirmationMeta = (value) =>
  CONFIRMATION_STATUSES.find((status) => status.value === value) ?? CONFIRMATION_STATUSES[0];

export const confirmationSourceLabel = (value) =>
  ({
    manual: 'Set by organizer',
    import: 'Imported',
    rsvp: 'Guest RSVP',
    call: 'Recorded by call',
  })[value] || 'Not recorded';

export const CALLING_OUTCOMES = [
  { value: 'confirmed', label: 'Confirmed', tone: 'emerald', terminal: true },
  { value: 'not_confirmed', label: 'Not coming', tone: 'rose', terminal: true },
  { value: 'no_answer', label: 'No answer', tone: 'amber', terminal: false },
  { value: 'busy', label: 'Line busy', tone: 'amber', terminal: false },
  { value: 'phone_off', label: 'Phone off', tone: 'amber', terminal: false },
  { value: 'wrong_number', label: 'Wrong number', tone: 'rose', terminal: true },
  { value: 'call_back_later', label: 'Call back later', tone: 'sky', terminal: false },
];

export const callingOutcomeMeta = (value) =>
  CALLING_OUTCOMES.find((outcome) => outcome.value === value) ?? null;

export const VALIDATION_META = {
  valid: { label: 'VALID', tone: 'emerald' },
  already_checked_in: { label: 'DUPLICATE', tone: 'amber' },
  denied: { label: 'DENIED', tone: 'rose' },
};

export const MESSAGE_PLACEHOLDERS = [
  { token: '{guest_name}', label: 'Guest name' },
  { token: '{table_number}', label: 'Table number' },
  { token: '{event_title}', label: 'Event title' },
  { token: '{qr_link}', label: 'QR invitation link' },
];

export const DEFAULT_MESSAGES = {
  whatsapp:
    "Hello {guest_name},\n\nYou are warmly invited to {event_title}.\n\nYour seat is reserved at Table {table_number}. Please present your QR pass at the gate.\n\nView your e-card and QR pass: {qr_link}",
  sms: 'Hello {guest_name}! You are invited to {event_title}. Table: {table_number}. View your e-card and QR pass: {qr_link}',
  email:
    "Dear {guest_name},\n\nIt would be our honour to have you at {event_title}.\n\nYour seat is reserved at Table {table_number}. Kindly present the QR pass attached to this invitation at the entrance.\n\nView your e-card: {qr_link}\n\nWarm regards,\nThe Host",
};

export const EMAIL_SUBJECT = 'Your invitation to {event_title}';

export const ROLE_LABELS = {
  super_admin: 'Super admin',
  organizer: 'Organizer',
  usher: 'Usher',
};

export const ROLE_DESCRIPTIONS = {
  super_admin: 'Platform owner · organizers, providers & security',
  organizer: 'Event host · events, guests, cards & usher accounts',
  usher: 'Gate scanner · one event, gate label and password sign-in',
};

export const PAGE_SIZE = 9;
