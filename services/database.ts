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
    // CHANGE: Renamed to v2 to force a fresh database creation with new seed data
    super('ShadajDB_v2');
    
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
      id: 'studentA@shadaj.com',
      email: 'studentA@shadaj.com',
      name: 'Student A',
      password: 'password',
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Student+A&background=random',
      instrument: 'Vocal',
      bio: 'Enthusiastic learner of Khayal. Seeking to master the Gwalior Gharana style.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Praveshika Purna',
      interests: ['Vocal', 'Raag Theory'],
      dob: '1998-05-15',
      points: 500
    },
    {
      id: 'teacherA@shadaj.com',
      email: 'teacherA@shadaj.com',
      name: 'Teacher A',
      role: 'guru',
      avatar: 'https://ui-avatars.com/api/?name=Teacher+A&background=0d9488&color=fff',
      instrument: 'Sitar',
      bio: 'Exp: 30+ years. Specializes in Maihar Gharana and advanced laykari.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Sangit Acharya',
      interests: ['Sitar', 'Teaching', 'Research'],
      dob: '1970-08-20',
      points: 12000
    },
    {
      id: 'studentB@shadaj.com',
      email: 'studentB@shadaj.com',
      name: 'Student B',
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Student+B&background=random',
      instrument: 'Sitar',
      bio: 'Intermediate level, working on Raag Yaman and fast taans.',
      connections: ['studentA@shadaj.com'],
      createdAt: Date.now(),
      examinationLevel: 'Madhyama Pratham',
      interests: ['Sitar', 'Fusion'],
      dob: '2000-01-10',
      points: 350
    },
    {
      id: 'studentC@shadaj.com',
      email: 'studentC@shadaj.com',
      name: 'Student C',
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Student+C&background=random',
      instrument: 'Vocal',
      bio: 'Beginner, focusing on Alankaars and voice culture.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Prarambhik',
      interests: ['Vocal', 'Light Music', 'Carnatic'],
      dob: '2002-11-05',
      points: 150
    },
    {
      id: 'teacherB@shadaj.com',
      email: 'teacherB@shadaj.com',
      name: 'Teacher B',
      role: 'guru',
      avatar: 'https://ui-avatars.com/api/?name=Teacher+B&background=0d9488&color=fff',
      instrument: 'Vocal',
      bio: 'Renowned Khayal vocalist and researcher in Thumri.',
      connections: [],
      createdAt: Date.now(),
      examinationLevel: 'Sangit Acharya',
      interests: ['Vocal', 'Thumri', 'Dadra'],
      dob: '1980-03-12',
      points: 8500
    }
  ]);

  db.posts.bulkAdd([
    {
      id: 'p1',
      authorId: 'teacherA@shadaj.com',
      authorName: 'Teacher A',
      authorAvatar: 'https://ui-avatars.com/api/?name=Teacher+A&background=0d9488&color=fff',
      authorRole: 'guru',
      authorInstrument: 'Sitar',
      content: "Just finished a morning session of Raag Ahir Bhairav. The transition between Komal Re and Shuddha Re is always magical. Practice slowly to get the meend right.",
      image: 'https://picsum.photos/seed/music1/800/450',
      likedBy: ['studentA@shadaj.com', 'studentB@shadaj.com'],
      comments: [
        {
          id: 'c1',
          authorId: 'studentA@shadaj.com',
          authorName: 'Student A',
          authorAvatar: 'https://ui-avatars.com/api/?name=Student+A&background=random',
          text: 'Pranam Guruji, that sounds divine! I will practice the meend today.',
          timestamp: new Date().toISOString()
        }
      ],
      timestamp: Date.now() - 7200000,
      tags: ['#RaagAhirBhairav', '#Sitar', '#MorningRiyaz']
    }
  ]);
  
  // Seed Notifications
  db.notifications.bulkAdd([
    {
        id: 'n1',
        userId: 'studentA@shadaj.com',
        type: 'system',
        title: 'Welcome to Shadaj',
        message: 'Complete your profile to start connecting with gurus.',
        isRead: false,
        timestamp: Date.now()
    }
  ]);
});