// ===========================
// Firebase Service Module
// Merged: firebase-config.js + database-service.js
// ===========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { ref, get, set, update, push, remove, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===========================
// Firebase Configuration
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyC894z5MfmIviz8YOnTpssizDOVCTOZtD8",
  authDomain: "first-test-19fce.firebaseapp.com",
  databaseURL: "https://first-test-19fce-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "first-test-19fce",
  storageBucket: "first-test-19fce.firebasestorage.app",
  messagingSenderId: "147599904419",
  appId: "1:147599904419:web:b6334284341a530bca7916",
  measurementId: "G-8YX349L55M"
};

const app = initializeApp(firebaseConfig);

// ===========================
// Firebase Services
// ===========================
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Firebase initialized successfully

// ===========================
// Database Functions - User Data
// ===========================
export async function getUserData(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// ===========================
// Database Functions - Tasks
// ===========================
export async function getUserTasks(userId) {
    try {
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const snapshot = await get(tasksRef);
        
        if (snapshot.exists()) {
            const tasksObj = snapshot.val();
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

export async function addTask(userId, taskData) {
    try {
        const tasksRef = ref(database, `users/${userId}/tasks`);
        const newTaskRef = push(tasksRef);
        await set(newTaskRef, {
            ...taskData,
            createdAt: new Date().toISOString()
        });
        return newTaskRef.key;
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}

export async function updateTaskStatus(userId, taskId, completed) {
    try {
        const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
        await update(taskRef, { completed });
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

// ===========================
// Database Functions - Courses
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
        }
        return [];
    } catch (error) {
        console.error('Error getting courses:', error);
        return [];
    }
}

export async function addCourse(userId, courseData) {
    try {
        const coursesRef = ref(database, `users/${userId}/courses`);
        const newCourseRef = push(coursesRef);
        await set(newCourseRef, {
            ...courseData,
            createdAt: new Date().toISOString()
        });
        return newCourseRef.key;
    } catch (error) {
        console.error('Error adding course:', error);
        throw error;
    }
}

export async function updateCourse(userId, courseId, courseData) {
    try {
        const courseRef = ref(database, `users/${userId}/courses/${courseId}`);
        await update(courseRef, courseData);
        return courseId;
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
}

// ===========================
// Database Functions - Resources
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
        }
        return [];
    } catch (error) {
        console.error('Error getting resources:', error);
        return [];
    }
}

// ===========================
// Database Functions - Announcements
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
        }
        return [];
    } catch (error) {
        console.error('Error getting announcements:', error);
        return [];
    }
}

// ===========================
// Database Functions - Chat & Messages
// ===========================
export async function getUserChats(userId) {
    try {
        const chatsRef = ref(database, `conversations/${userId}`);
        const snapshot = await get(chatsRef);
        
        if (snapshot.exists()) {
            const chatsObj = snapshot.val();
            return Object.keys(chatsObj).map(key => ({
                id: key,
                ...chatsObj[key]
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting chats:', error);
        return [];
    }
}

// ===========================
// Database Functions - Events
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
        }
        return [];
    } catch (error) {
        console.error('Error getting events:', error);
        return [];
    }
}

// ===========================
// Database Functions - Dashboard Stats
// ===========================
export async function getDashboardStats(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return {
                activeCourses: userData.courses ? Object.keys(userData.courses).length : 0,
                pendingTasks: userData.tasks ? Object.values(userData.tasks).filter(t => !t.completed).length : 0,
                gpa: userData.gpa || 0,
                attendance: userData.attendance || 85
            };
        }
        return { activeCourses: 0, pendingTasks: 0, gpa: 0, attendance: 85 };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return { activeCourses: 0, pendingTasks: 0, gpa: 0, attendance: 85 };
    }
}

// ===========================
// Database Functions - Course Materials
// ===========================
export async function addCourseMaterial(userId, courseId, materialData) {
    try {
        const materialsRef = ref(database, `users/${userId}/courses/${courseId}/materials`);
        const newMaterialRef = push(materialsRef);
        await set(newMaterialRef, {
            ...materialData,
            createdAt: new Date().toISOString()
        });
        return newMaterialRef.key;
    } catch (error) {
        console.error('Error adding material:', error);
        throw error;
    }
}

export async function getCourseMaterials(userId, courseId) {
    try {
        const materialsRef = ref(database, `users/${userId}/courses/${courseId}/materials`);
        const snapshot = await get(materialsRef);
        
        if (snapshot.exists()) {
            const materialsObj = snapshot.val();
            return Object.keys(materialsObj).map(key => ({
                id: key,
                ...materialsObj[key]
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error getting materials:', error);
        return [];
    }
}

export async function deleteCourseMaterial(userId, courseId, materialId) {
    try {
        const materialRef = ref(database, `users/${userId}/courses/${courseId}/materials/${materialId}`);
        await remove(materialRef);
    } catch (error) {
        console.error('Error deleting material:', error);
        throw error;
    }
}

