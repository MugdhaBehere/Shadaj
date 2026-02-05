
export type UserRole = 'student' | 'guru';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  role: UserRole;
  instrument?: string;
  location?: string;
  bio?: string;
  connections: string[]; // Array of User IDs
  // Profile specific fields
  examinationLevel?: string;
  interests?: string[]; 
  dob?: string;
  points: number; // Swar Points Balance
}

export interface Post {
  id: string;
  author: User;
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: Comment[];
  timestamp: string;
  tags: string[];
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  timestamp: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  audio?: string;
  isAI?: boolean;
  timestamp: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  type: 'hourly' | 'daily' | 'monthly';
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'invite' | 'system' | 'message' | 'points';
  title: string;
  message: string;
  isRead: boolean;
  timestamp: number;
  link?: string;
}

export enum AppSection {
  FEED = 'feed',
  PRACTICE = 'practice',
  GURUS = 'gurus', // Now represents Network
  CHAT = 'chat',
  LIVE_GURU = 'live_guru',
  VIDEO_ROOM = 'video_room',
  PAYMENTS = 'payments',
  PROFILE = 'profile',
  STUDENTS = 'students' // Guru specific
}