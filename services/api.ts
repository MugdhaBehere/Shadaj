import { User, AppNotification } from '../types';
import { db, UserEntity, PostEntity, NotificationEntity } from './database';

// Helper to determine if we should fallback to local DB
const handleRequest = async (apiCall: () => Promise<any>, fallback: () => Promise<any>) => {
    try {
        // Try the real backend API
        const response = await apiCall();
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.message || 'Server Error');
        }
        return await response.json();
    } catch (error) {
        return await fallback();
    }
};

export const api = {
    auth: {
        login: async (credentials: any) => {
            return handleRequest(
                () => fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                }),
                async () => {
                    const user = await db.users.get(credentials.email);
                    if (!user || user.password !== credentials.password) {
                        throw new Error("Invalid credentials (Local DB)");
                    }
                    return { result: user, token: 'mock-jwt-token' };
                }
            );
        },

        register: async (userData: any) => {
            return handleRequest(
                () => fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                }),
                async () => {
                    const existing = await db.users.get(userData.email);
                    if (existing) throw new Error("User exists (Local DB)");
                    
                    const newUser: UserEntity = {
                        ...userData,
                        id: userData.email,
                        connections: [],
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
                        createdAt: Date.now(),
                        examinationLevel: '',
                        interests: [],
                        dob: '',
                        points: 100
                    };
                    await db.users.add(newUser);
                    return { result: newUser, token: 'mock-jwt-token' };
                }
            );
        },

        googleLogin: async (googleData: any) => {
             return handleRequest(
                () => fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(googleData)
                }),
                async () => {
                    let user = await db.users.get(googleData.email);
                    if (!user) {
                        const newUser: UserEntity = {
                            id: googleData.email,
                            email: googleData.email,
                            name: googleData.name,
                            avatar: googleData.avatar,
                            role: 'student',
                            instrument: 'Vocal',
                            bio: 'Joined via Google',
                            connections: [],
                            createdAt: Date.now(),
                            examinationLevel: '',
                            interests: [],
                            dob: '',
                            points: 100
                        };
                        await db.users.add(newUser);
                        user = newUser;
                    } else {
                        // Update Avatar if Google provides a different one
                        if (googleData.avatar && user.avatar !== googleData.avatar) {
                            user.avatar = googleData.avatar;
                            await db.users.put(user);
                        }
                    }
                    return { result: user, token: 'mock-jwt-token' };
                }
             );
        }
    },

    user: {
        getAll: async () => {
             return handleRequest(
                () => fetch('/api/users'),
                async () => {
                    return await db.users.toArray();
                }
             );
        },
        
        updateProfile: async (userId: string, updates: Partial<User>) => {
            return handleRequest(
                () => fetch(`/api/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                }),
                async () => {
                    const user = await db.users.get(userId);
                    if (!user) throw new Error("User not found");
                    const updatedUser = { ...user, ...updates };
                    await db.users.put(updatedUser as UserEntity);
                    return updatedUser;
                }
            );
        },

        toggleConnection: async (targetId: string, currentUserId: string) => {
            return handleRequest(
                () => fetch(`/api/users/${targetId}/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentUserId })
                }),
                async () => {
                    const user = await db.users.get(currentUserId);
                    if (!user) throw new Error("User not found");
                    
                    const idx = user.connections.indexOf(targetId);
                    if (idx === -1) {
                        user.connections.push(targetId);
                    } else {
                        user.connections.splice(idx, 1);
                    }
                    await db.users.put(user);
                    return user;
                }
            );
        }
    },

    notifications: {
        get: async (userId: string) => {
            return handleRequest(
                () => fetch(`/api/notifications?userId=${userId}`),
                async () => {
                    // Local DB fallback
                    return await db.notifications
                        .where('userId').equals(userId)
                        .reverse()
                        .sortBy('timestamp');
                }
            );
        },
        
        sendInvite: async (data: { recipients: string[], title: string, message: string, link?: string }) => {
            return handleRequest(
                () => fetch('/api/notifications/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }),
                async () => {
                    // Local DB fallback: Store notification for each recipient
                    const now = Date.now();
                    const newNotifications: NotificationEntity[] = data.recipients.map((uid, i) => ({
                        id: 'loc_notif_' + now + '_' + i,
                        userId: uid,
                        type: 'invite',
                        title: data.title,
                        message: data.message,
                        isRead: false,
                        timestamp: now,
                        link: data.link
                    }));
                    
                    await db.notifications.bulkAdd(newNotifications);
                    console.log("[MOCK EMAIL] Emails sent to:", data.recipients);
                    return { success: true };
                }
            );
        },

        markRead: async (notificationId: string) => {
            return handleRequest(
                () => fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' }),
                async () => {
                    await db.notifications.update(notificationId, { isRead: true });
                    return { success: true };
                }
            );
        }
    },

    feed: {
        getPosts: async () => {
            return handleRequest(
                () => fetch('/api/feed'),
                async () => {
                    const posts = await db.posts.orderBy('timestamp').reverse().toArray();
                    return posts;
                }
            );
        },

        createPost: async (postData: any) => {
            return handleRequest(
                () => fetch('/api/feed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                }),
                async () => {
                    const newPost: PostEntity = {
                        ...postData,
                        id: 'local_' + Date.now(),
                        likedBy: [],
                        comments: [],
                        timestamp: Date.now()
                    };
                    await db.posts.add(newPost);
                    return newPost;
                }
            );
        },

        deletePost: async (postId: string) => {
            return handleRequest(
                () => fetch(`/api/feed/${postId}`, {
                    method: 'DELETE'
                }),
                async () => {
                    await db.posts.delete(postId);
                    return { success: true };
                }
            );
        },

        toggleLike: async (postId: string, userId: string) => {
            return handleRequest(
                () => fetch(`/api/feed/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                }),
                async () => {
                    const post = await db.posts.get(postId);
                    if (!post) throw new Error("Post not found");
                    
                    const idx = post.likedBy.indexOf(userId);
                    if (idx === -1) {
                        post.likedBy.push(userId);
                    } else {
                        post.likedBy.splice(idx, 1);
                    }
                    await db.posts.put(post);
                    return post;
                }
            );
        },

        addComment: async (postId: string, comment: any) => {
             return handleRequest(
                () => fetch(`/api/feed/${postId}/comment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comment })
                }),
                async () => {
                    const post = await db.posts.get(postId);
                    if (!post) throw new Error("Post not found");
                    
                    post.comments.push(comment);
                    await db.posts.put(post);
                    return post;
                }
             );
        }
    }
};