// ===========================
// Authentication Module
// Merged: auth-logout.js + auth-guard.js
// ===========================
import { auth, database } from './firebase-service.js';
import { 
    onAuthStateChanged,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===========================
// Current User Management
// ===========================
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // user logged in
        currentUser = user;
        
        try {
            const userSnapshot = await get(ref(database, 'users/' + user.uid));
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                updateUserProfile(userData);
                document.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, userData } }));
            } else {
                const userData = {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    gpa: 0,
                    tasks: []
                };
                updateUserProfile(userData);
                document.dispatchEvent(new CustomEvent('authReady', { detail: { uid: user.uid, userData } }));
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    } else {
        // no user logged in — redirecting
        window.location.href = 'login.html';
    }
});

// ===========================
// Update User Profile in UI
// ===========================
function updateUserProfile(userData) {
    const userName = userData.name || currentUser.displayName || currentUser.email.split('@')[0];
    
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) userNameElement.textContent = userName;
    
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
    if (userNameFull) userNameFull.textContent = userName;
    
    const userEmail = document.querySelector('.user-email');
    if (userEmail && currentUser.email) userEmail.textContent = currentUser.email;
    
    const welcomeMessage = document.querySelector('.welcome-section h1');
    if (welcomeMessage) {
        const firstName = userName.split(' ')[0];
        const hour = new Date().getHours();
        let greeting = 'Welcome back';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        welcomeMessage.innerHTML = `${greeting}, ${firstName}! 👋`;
    }
    
    if (userData.gpa) {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const text = card.querySelector('.stat-info p');
            if (text && text.textContent === 'GPA') {
                const value = card.querySelector('.stat-info h3');
                if (value) value.textContent = userData.gpa.toFixed(1);
            }
        });
    }
    
    hideContentForNewUser(userData);
}

// ===========================
// Hide Demo Content for New Users
// ===========================
function hideContentForNewUser(userData) {
    const isNewUser = !userData.tasks || userData.tasks.length === 0;
    
    if (isNewUser) {
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
    }
}

// ===========================
// Logout Handler
// ===========================
export async function handleLogout() {
    const confirmed = await showLogoutConfirmation();
    if (!confirmed) return;
    
    try {
        showLogoutLoading();
        await signOut(auth);
        clearLocalData();
        showLogoutSuccess();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showLogoutError(error.message);
    }
}

// ===========================
// Logout Confirmation Modal
// ===========================
function showLogoutConfirmation() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'logout-modal-overlay';
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
            animation: fadeIn 0.2s ease;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'logout-modal';
        modal.style.cssText = `
            background: var(--white);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 64px; height: 64px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">👋</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">Logout Confirmation</h2>
                <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6;">Are you sure you want to logout?</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="cancelLogout" style="flex: 1; padding: 0.75rem 1.5rem; background: var(--light); border: 2px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">Cancel</button>
                    <button id="confirmLogout" style="flex: 1; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; border-radius: 10px; color: white; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">Logout</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        const cancelBtn = modal.querySelector('#cancelLogout');
        const confirmBtn = modal.querySelector('#confirmLogout');
        
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

// ===========================
// Loading State
// ===========================
function showLogoutLoading() {
    const toast = document.createElement('div');
    toast.id = 'logout-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--white);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        animation: slideInUp 0.3s ease;
        border-left: 4px solid var(--secondary-color);
    `;
    
    toast.innerHTML = `
        <div style="width: 20px; height: 20px; border: 2px solid var(--secondary-color); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <span style="font-weight: 500;">Logging out...</span>
    `;
    
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    document.body.appendChild(toast);
}

// ===========================
// Success Message
// ===========================
function showLogoutSuccess() {
    const existingToast = document.getElementById('logout-toast');
    if (existingToast) {
        existingToast.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        existingToast.style.color = 'white';
        existingToast.style.borderLeft = 'none';
        existingToast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="font-weight: 600;">Logged out successfully!</span>
        `;
    }
}

// ===========================
// Error Message
// ===========================
function showLogoutError(message) {
    const existingToast = document.getElementById('logout-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        animation: slideInUp 0.3s ease;
    `;
    
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div>
            <div style="font-weight: 600; margin-bottom: 0.25rem;">Logout Failed</div>
            <div style="font-size: 0.85rem; opacity: 0.9;">${message}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===========================
// Clear Local Data
// ===========================
function clearLocalData() {
    try {
        localStorage.removeItem('userData');
        localStorage.removeItem('userPreferences');
        localStorage.removeItem('cachedCourses');
        sessionStorage.clear();
    } catch (error) {
        console.error('Error clearing local data:', error);
    }
}

// ===========================
// Password Management
// ===========================
export async function changePassword(currentPassword, newPassword) {
    if (!currentUser) throw new Error('No user is currently logged in');

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
        return { success: true, message: 'Password changed successfully!' };
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            throw new Error('Current password is incorrect');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('New password is too weak');
        } else {
            throw new Error(error.message || 'Failed to change password');
        }
    }
}

// ===========================
// Export Functions
// ===========================
export function getCurrentUser() {
    return currentUser;
}

export function getCurrentUserId() {
    return currentUser ? currentUser.uid : null;
}

// Add animation styles
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideInUp { from { opacity: 0; transform: translateY(100px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(animationStyles);

// Auth module loaded
