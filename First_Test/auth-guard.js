import { auth, database } from './firebase-config.js';
import { 
    onAuthStateChanged,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
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

                // Notify app that auth + user data are ready
                document.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, userData } }));
            } else {
                console.log('No user data found, using auth profile');
                // Use auth profile if no database entry
                const userData = {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    gpa: 0,
                    tasks: []
                };
                updateUserProfile(userData);

                // Still try to load dashboard
                await loadDashboard();

                // Notify app that auth is ready (with fallback userData)
                document.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, userData } }));
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

// ===========================
// Change Password Functionality
// ===========================
export async function changePassword(currentPassword, newPassword) {
    if (!currentUser) {
        throw new Error('No user is currently logged in');
    }

    try {
        // Reauthenticate user with current password
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );

        await reauthenticateWithCredential(currentUser, credential);
        console.log('User reauthenticated successfully');

        // Update password
        await updatePassword(currentUser, newPassword);
        console.log('Password updated successfully');
        
        return {
            success: true,
            message: 'Password changed successfully!'
        };
    } catch (error) {
        console.error('Error changing password:', error);
        
        if (error.code === 'auth/wrong-password') {
            throw new Error('Current password is incorrect');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('New password is too weak. Please use a stronger password.');
        } else {
            throw new Error(error.message || 'Failed to change password');
        }
    }
}

// Setup change password button handler
document.addEventListener('DOMContentLoaded', () => {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            showChangePasswordModal();
        });
    }
});

function showChangePasswordModal() {
    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'password-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modal.innerHTML = `
        <h2 style="
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        ">
            Change Password
        </h2>
        <form id="changePasswordForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label style="
                    display: block;
                    color: var(--text-primary);
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                ">
                    Current Password
                </label>
                <input type="password" id="currentPassword" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
            </div>
            <div>
                <label style="
                    display: block;
                    color: var(--text-primary);
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                ">
                    New Password
                </label>
                <input type="password" id="newPassword" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
            </div>
            <div>
                <label style="
                    display: block;
                    color: var(--text-primary);
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                ">
                    Confirm Password
                </label>
                <input type="password" id="confirmPassword" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" id="cancelPassword" style="
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--light);
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    Cancel
                </button>
                <button type="submit" style="
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--primary-color);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    Change Password
                </button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#changePasswordForm');
    const currentPassword = modal.querySelector('#currentPassword');
    const newPassword = modal.querySelector('#newPassword');
    const confirmPassword = modal.querySelector('#confirmPassword');
    const cancelBtn = modal.querySelector('#cancelPassword');

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
        overlay.remove();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const current = currentPassword.value;
        const newPass = newPassword.value;
        const confirmPass = confirmPassword.value;

        // Validate passwords
        if (newPass !== confirmPass) {
            alert('New passwords do not match!');
            return;
        }

        if (newPass.length < 6) {
            alert('New password must be at least 6 characters long!');
            return;
        }

        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Changing...';

            const result = await changePassword(current, newPass);
            alert(result.message);
            overlay.remove();
        } catch (error) {
            alert('Error: ' + error.message);
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    });
}

console.log('Auth guard loaded successfully!');