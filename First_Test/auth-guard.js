import { auth, database } from './firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    ref, 
    get 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { loadDashboard } from './dashboard-loader.js';

// ===========================
// Authentication Guard
// ===========================
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        currentUser = user;
        
        // Load user data from Realtime Database
        try {
            const userSnapshot = await get(ref(database, 'users/' + user.uid));
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                console.log('User data loaded:', userData);
                
                // Update UI with user data
                updateUserProfile(userData);
                
                // Load dashboard data
                await loadDashboard();
            } else {
                console.log('No user data found, using auth profile');
                // Use auth profile if no database entry
                updateUserProfile({
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    gpa: 0,
                    tasks: []
                });
                
                // Still try to load dashboard
                await loadDashboard();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
        
    } else {
        // No user is signed in, redirect to login
        console.log('No user logged in, redirecting to login...');
        window.location.href = 'login.html';
    }
});

// ===========================
// Update User Profile in UI
// ===========================
function updateUserProfile(userData) {
    // Get the name from Firestore data or Firebase Auth displayName
    const userName = userData.name || currentUser.displayName || currentUser.email.split('@')[0];
    
    // Update user name in header
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    // Update user avatar with initials
    const userAvatarElement = document.querySelector('.user-avatar');
    if (userAvatarElement) {
        const initials = userName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatarElement.textContent = initials;
    }
    
    // Update dropdown header
    const userAvatarLarge = document.querySelector('.user-avatar-large');
    if (userAvatarLarge) {
        const initials = userName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatarLarge.textContent = initials;
    }
    
    const userNameFull = document.querySelector('.user-name-full');
    if (userNameFull) {
        userNameFull.textContent = userName;
    }
    
    const userEmail = document.querySelector('.user-email');
    if (userEmail && currentUser.email) {
        userEmail.textContent = currentUser.email;
    }
    
    // Update welcome message
    const welcomeMessage = document.querySelector('.welcome-section h1');
    if (welcomeMessage) {
        const firstName = userName.split(' ')[0];
        const hour = new Date().getHours();
        let greeting = 'Welcome back';
        
        if (hour < 12) {
            greeting = 'Good morning';
        } else if (hour < 18) {
            greeting = 'Good afternoon';
        } else {
            greeting = 'Good evening';
        }
        
        welcomeMessage.innerHTML = `${greeting}, ${firstName}! 👋`;
    }
    
    // Update GPA if exists
    if (userData.gpa) {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const text = card.querySelector('.stat-info p');
            if (text && text.textContent === 'GPA') {
                const value = card.querySelector('.stat-info h3');
                if (value) {
                    value.textContent = userData.gpa.toFixed(1);
                }
            }
        });
    }
    
    // Hide demo content for new users
    hideContentForNewUser(userData);
}

// ===========================
// Hide demo content for new users
// ===========================
function hideContentForNewUser(userData) {
    // Check if user is new (no tasks, courses, etc.)
    const isNewUser = !userData.tasks || userData.tasks.length === 0;
    
    if (isNewUser) {
        // Hide demo tasks
        const taskList = document.querySelector('.task-list');
        if (taskList) {
            taskList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Tasks Yet</h3>
                    <p>Your assignments and tasks will appear here</p>
                </div>
            `;
        }
        
        // Hide demo resources
        const resourceList = document.querySelector('.resource-list');
        if (resourceList) {
            resourceList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Resources Yet</h3>
                    <p>Course materials and resources will appear here</p>
                </div>
            `;
        }
        
        // Hide demo announcements
        const announcementList = document.querySelector('.announcement-list');
        if (announcementList) {
            announcementList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📢</div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Announcements</h3>
                    <p>Important updates will appear here</p>
                </div>
            `;
        }
        
        // Hide demo chats
        const chatList = document.querySelector('.chat-list');
        if (chatList) {
            chatList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Chats Yet</h3>
                    <p>Start a conversation with your professors or classmates</p>
                </div>
            `;
        }
        
        // Update stats for new users
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 2) {
            // Update Active Courses
            const courseStat = statCards[0].querySelector('h3');
            if (courseStat) courseStat.textContent = '0';
            
            // Update Pending Tasks
            const taskStat = statCards[1].querySelector('h3');
            if (taskStat) taskStat.textContent = '0';
        }
    }
}

// ===========================
// Logout Functionality
// ===========================
// Listen for logout event from dropdown
document.addEventListener('userLogout', async () => {
    try {
        await signOut(auth);
        console.log('User signed out successfully');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
});

// Export getCurrentUserId for use in other modules
const logoutLink = document.querySelector('a[href="#logout"]');

if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (confirm('Are you sure you want to logout?')) {
            try {
                await signOut(auth);
                console.log('User signed out successfully');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Failed to logout. Please try again.');
            }
        }
    });
}

// ===========================
// Export current user
// ===========================
export function getCurrentUser() {
    return currentUser;
}

export function getCurrentUserId() {
    return currentUser ? currentUser.uid : null;
}

console.log('Auth guard loaded successfully!');