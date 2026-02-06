import Dexie, { Table } from 'dexie';
import { User, UserRole, AppNotification } from '../types';

// Define the User entity structure for the DB
export interface UserEntity {
  id: string; // We will use email as the ID for simplicity
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  instrument: string;
  bio: string;
  connections: string[]; // List of connected user IDs
  createdAt: number;
  examinationLevel?: string;
  interests?: string[];
  dob?: string;
  points: number;
}

export interface CommentEntity {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
}

export interface PostEntity {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  authorInstrument: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  isAI?: boolean;
  likedBy: string[]; // Array of user IDs who liked
  comments: CommentEntity[];
  timestamp: number; // Unix timestamp for sorting
  tags: string[];
}

export interface NotificationEntity extends AppNotification {}

class ShadajDatabase extends Dexie {
  users!: Table<UserEntity>;
  posts!: Table<PostEntity>;
  notifications!: Table<NotificationEntity>;

  constructor() {
    super('ShadajDB');
    // Define schema
    (this as any).version(1).stores({
      users: 'id, email, role',
      posts: 'id, timestamp, authorId', // Indexed props
      notifications: 'id, userId, timestamp'
    });
  }
}

export const db = new ShadajDatabase();

// Initial Seed for Demo
(db as any).on('populate', () => {
  db.users.bulkAdd([
    {
      id: 'demo@shadaj.com',
      email: 'demo@shadaj.com',
      name: 'Demo Student',
      password: 'password',
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Demo+Student&background=random',
      instrument: 'Vocal',
      bio: 'Enthusiastic learner of Khayal.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Praveshika Purna',
      interests: ['Vocal', 'Raag Theory'],
      dob: '1998-05-15',
      points: 500
    },
    {
      id: 'g1',
      email: 'ravi@shadaj.com',
      name: 'Demo Teacher A',
      role: 'guru',
      avatar: 'https://picsum.photos/seed/guru1/100/100',
      instrument: 'Sitar',
      bio: 'Exp: 25+ years. Specializes in Maihar Gharana.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Sangit Acharya',
      interests: ['Sitar', 'Teaching', 'Research'],
      dob: '1975-08-20',
      points: 12000
    },
    {
      id: 's1',
      email: 'vikram@shadaj.com',
      name: 'Demo Student B',
      role: 'student',
      avatar: 'https://picsum.photos/seed/s1/100/100',
      instrument: 'Sitar',
      bio: 'Intermediate level, working on Raag Yaman.',
      connections: ['demo@shadaj.com'],
      createdAt: Date.now(),
      examinationLevel: 'Madhyama Pratham',
      interests: ['Sitar', 'Fusion'],
      dob: '2000-01-10',
      points: 350
    },
    {
      id: 's2',
      email: 'sanya@shadaj.com',
      name: 'Demo Student A',
      role: 'student',
      avatar: 'https://picsum.photos/seed/s2/100/100',
      instrument: 'Vocal',
      bio: 'Beginner, focusing on Alankaars.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Prarambhik',
      interests: ['Vocal', 'Light Music'],
      dob: '2002-11-05',
      points: 150
    }
  ]);

  db.posts.bulkAdd([
    {
      id: 'p1',
      authorId: 'g1',
      authorName: 'Demo Teacher',
      authorAvatar: 'https://picsum.photos/seed/guru1/100/100',
      authorRole: 'guru',
      authorInstrument: 'Sitar',
      content: "Just finished a morning session of Raag Ahir Bhairav. The transition between Komal Re and Shuddha Re is always magical.",
      image: 'https://picsum.photos/seed/music1/800/450',
      likedBy: ['demo@shadaj.com', 'user2'],
      comments: [
        {
          id: 'c1',
          authorId: 'demo@shadaj.com',
          authorName: 'Demo Student',
          authorAvatar: 'https://ui-avatars.com/api/?name=Demo+Student&background=random',
          text: 'Pranam Guruji, that sounds divine!',
          timestamp: new Date().toISOString()
        }
      ],
      timestamp: Date.now() - 7200000,
      tags: ['#RaagAhirBhairav', '#Santoor', '#MorningRiyaz']
    }
  ]);
  
  // Seed Notifications
  db.notifications.bulkAdd([
    {
        id: 'n1',
        userId: 'demo@shadaj.com',
        type: 'system',
        title: 'Welcome to Shadaj',
        message: 'Complete your profile to start connecting with gurus.',
        isRead: false,
        timestamp: Date.now()
    }
  ]);
});