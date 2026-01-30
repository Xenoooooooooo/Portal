import { database } from './firebase-config.js';
import { 
    ref, 
    get,
    set,
    update,
    push,
    onValue,
    off
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===========================
// Get Current User Data
// ===========================
export async function getUserData(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('No user data found');
            return null;
        }
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// ===========================
// Get User Tasks
// ===========================
export async function getUserTasks(userId) {
    try {
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const snapshot = await get(tasksRef);
        
        if (snapshot.exists()) {
            const tasksObj = snapshot.val();
            // Convert object to array
            return Object.keys(tasksObj).map(key => ({
                id: key,
                ...tasksObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
    }
}

// ===========================
// Add New Task
// ===========================
export async function addTask(userId, taskData) {
    try {
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const newTaskRef = push(tasksRef);
        
        await set(newTaskRef, {
            ...taskData,
            createdAt: new Date().toISOString(),
            completed: false
        });
        
        return newTaskRef.key;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}

// ===========================
// Update Task Status
// ===========================
export async function updateTaskStatus(userId, taskId, completed) {
    try {
        const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
        await update(taskRef, { completed });
        return true;
    } catch (error) {
        console.error('Error updating task:', error);
        return false;
    }
}

// ===========================
// Get User Courses
// ===========================
export async function getUserCourses(userId) {
    try {
        const coursesRef = ref(database, `users/${userId}/courses`);
        const snapshot = await get(coursesRef);
        
        if (snapshot.exists()) {
            const coursesObj = snapshot.val();
            return Object.keys(coursesObj).map(key => ({
                id: key,
                ...coursesObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting courses:', error);
        return [];
    }
}

// ===========================
// Get User Resources
// ===========================
export async function getUserResources(userId) {
    try {
        const resourcesRef = ref(database, `users/${userId}/resources`);
        const snapshot = await get(resourcesRef);
        
        if (snapshot.exists()) {
            const resourcesObj = snapshot.val();
            return Object.keys(resourcesObj).map(key => ({
                id: key,
                ...resourcesObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting resources:', error);
        return [];
    }
}

// ===========================
// Get Announcements
// ===========================
export async function getAnnouncements() {
    try {
        const announcementsRef = ref(database, 'announcements');
        const snapshot = await get(announcementsRef);
        
        if (snapshot.exists()) {
            const announcementsObj = snapshot.val();
            return Object.keys(announcementsObj).map(key => ({
                id: key,
                ...announcementsObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting announcements:', error);
        return [];
    }
}

// ===========================
// Get User Chats
// ===========================
export async function getUserChats(userId) {
    try {
        const chatsRef = ref(database, `users/${userId}/chats`);
        const snapshot = await get(chatsRef);
        
        if (snapshot.exists()) {
            const chatsObj = snapshot.val();
            return Object.keys(chatsObj).map(key => ({
                id: key,
                ...chatsObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting chats:', error);
        return [];
    }
}

// ===========================
// Get User Events
// ===========================
export async function getUserEvents(userId) {
    try {
        const eventsRef = ref(database, `users/${userId}/events`);
        const snapshot = await get(eventsRef);
        
        if (snapshot.exists()) {
            const eventsObj = snapshot.val();
            return Object.keys(eventsObj).map(key => ({
                id: key,
                ...eventsObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting events:', error);
        return [];
    }
}

// ===========================
// Calculate Dashboard Stats
// ===========================
export async function getDashboardStats(userId) {
    try {
        const userData = await getUserData(userId);
        const tasks = await getUserTasks(userId);
        const courses = await getUserCourses(userId);
        
        const pendingTasks = tasks.filter(task => !task.completed).length;
        const activeCourses = courses.length;
        const gpa = userData?.gpa || 0;
        const attendance = userData?.attendance || 0;
        
        return {
            activeCourses,
            pendingTasks,
            gpa,
            attendance
        };
    } catch (error) {
        console.error('Error calculating stats:', error);
        return {
            activeCourses: 0,
            pendingTasks: 0,
            gpa: 0,
            attendance: 0
        };
    }
}

// ===========================
// Listen to Real-time Updates
// ===========================
export function listenToUserData(userId, callback) {
    const userRef = ref(database, `users/${userId}`);
    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    });
}

export function stopListening(userId) {
    const userRef = ref(database, `users/${userId}`);
    off(userRef);
}

console.log('Database service loaded successfully!');