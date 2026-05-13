import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type UserRole = 'member' | 'leader' | 'admin' | 'superadmin';
export type MemberStatus = 'visitor' | 'new_member' | 'integrated' | 'active' | 'inactive';

export interface AdminRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  adminRoleId?: string;
  avatar?: string;
  birthDate?: string; // ISO format or YYYY-MM-DD
  age?: number;
  address?: string;
  leaderOf?: string; // ID of the CellGroup they lead
  cellIds?: string[]; // IDs of the CellGroups they belong to
  memberStatus?: MemberStatus;
  integrationNotes?: string[];
  joinedAt?: string;
  notificationSettings?: {
    wordOfDayEnabled: boolean;
    wordOfDayTime: string; // HH:mm
    newSermonEnabled: boolean;
    allMuted: boolean;
  };
}

export interface PastoralVisit {
  id: string;
  uid: string;
  userName: string;
  userAddress: string;
  userPhone?: string;
  reason: string;
  preferredDate: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: any;
}

export interface Attendance {
  id: string;
  cellId: string;
  date: string;
  presentMembers: string[]; // Array of user UIDs
  absentMembers: string[]; // Array of user UIDs
  visitorsCount?: number;
  notes?: string;
  createdAt: any;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  description?: string;
  requiresRegistration?: boolean;
  registrationLimit?: number;
  fee?: number;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  uid: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  paid?: boolean;
  paymentProofUrl?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface PrayerComment {
  id: string;
  uid: string;
  userName: string;
  content: string;
  date: string;
  createdAt?: string;
}

export interface PrayerRequest {
  id: string;
  uid?: string;
  user: string;
  content: string;
  privacy?: 'public' | 'private';
  cellIds?: string[]; // The cells of the author at the time of posting
  date: string;
  likes: number;
  comments: number;
  commentsList?: PrayerComment[];
  prayedBy?: string[]; // Array of user UIDs who clicked "I prayed"
  createdAt?: any;
}

export interface CellGroup {
  id: string;
  name: string;
  leader: string;
  day: string;
  time: string;
  location: string;
  members: number;
  membersList?: string[]; // Array of user UIDs who are in the cell
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  date: string;
  author: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  duration: string; // changed to string to match form input "30 dias"
  imageUrl?: string;
  chapters: string[];
}

export interface VerseHighlight {
  id: string;
  uid: string;
  book: string;
  chapter: number;
  verse: number;
  color: string;
  text: string;
  createdAt: any;
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  videoUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  description: string;
  thumbnail?: string;
  createdAt: any;
}

export interface TitheConfig {
  pixKey: string;
  bankName: string;
  accountHolder: string;
  pixQrUrl?: string;
}

export interface TitheTransaction {
  id: string;
  uid: string;
  userName: string;
  amount: number;
  date: string;
  type: 'tithe' | 'offering' | 'love_offering';
  status: 'pending' | 'completed';
}

export interface Ministry {
  id: string;
  name: string;
  description: string;
  leaderIds: string[];
  memberIds: string[];
  pendingRequestIds: string[];
  imageUrl?: string;
  category: string;
  allowedRoleIds?: string[]; // IDs of AdminRole that can be assigned within this ministry
  memberRoles?: Record<string, string>; // Maps userId to one AdminRole id
}

export interface MinistrySchedule {
  id: string;
  ministryId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  assignedUserIds: string[];
  confirmations?: Record<string, 'confirmed' | 'declined' | 'pending'>;
  notes?: string;
}

export interface FinancialFund {
  id: string;
  name: string;
  description?: string;
  balance: number;
}

export interface FinancialTransaction {
  id: string;
  label: string;
  value: number;
  date: string;
  type: 'in' | 'out';
  category?: string;
  fundId?: string; // Links to a FinancialFund
  externalId?: string; // Useful for deduplication during bank imports
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  isEnabled: boolean;
  adminPhones?: string[];
}

export interface FinancialRule {
  id: string;
  keyword: string; // The label or part of it
  category: string;
}
