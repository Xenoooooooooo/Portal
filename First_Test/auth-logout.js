// auth-logout.js - Improved Logout Functionality
import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getIcon } from './icons.js';

// ===========================
// Logout Handler
// ===========================
export async function handleLogout() {
    // Show confirmation modal
    const confirmed = await showLogoutConfirmation();
    
    if (!confirmed) {
        return; // User cancelled
    }
    
    try {
        // Show loading state
        showLogoutLoading();
        
        // Sign out from Firebase
        await signOut(auth);
        
        // Clear local data
        clearLocalData();
        
        // Show success message
        showLogoutSuccess();
        
        // Redirect to login page after a short delay
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
        // Create modal overlay
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
        
        // Create modal
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
                <div style="
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                ">
                    ${getIcon('wave')}
                </div>
                <h2 style="
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    color: var(--text-primary);
                ">
                    Logout Confirmation
                </h2>
                <p style="
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                    line-height: 1.6;
                ">
                    Are you sure you want to logout?<br>
                </p>
                <div style="
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                ">
                    <button id="cancelLogout" style="
                        flex: 1;
                        padding: 0.75rem 1.5rem;
                        background: var(--light);
                        border: 2px solid var(--border);
                        border-radius: 10px;
                        color: var(--text-primary);
                        font-size: 0.95rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        Cancel
                    </button>
                    <button id="confirmLogout" style="
                        flex: 1;
                        padding: 0.75rem 1.5rem;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        border: none;
                        border-radius: 10px;
                        color: white;
                        font-size: 0.95rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                    ">
                        Logout
                    </button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Add hover effects
        const cancelBtn = modal.querySelector('#cancelLogout');
        const confirmBtn = modal.querySelector('#confirmLogout');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'var(--border)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'var(--light)';
        });
        
        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.transform = 'translateY(-2px)';
            confirmBtn.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.transform = 'translateY(0)';
            confirmBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
        });
        
        // Handle buttons
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        
        // Close on overlay click
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
        <div style="
            width: 20px;
            height: 20px;
            border: 2px solid var(--secondary-color);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        "></div>
        <span style="font-weight: 500;">Logging out...</span>
    `;
    
    // Add spin animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
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
    if (existingToast) {
        existingToast.remove();
    }
    
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
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ===========================
// Clear Local Data
// ===========================
function clearLocalData() {
    try {
        // Clear localStorage
        localStorage.removeItem('userData');
        localStorage.removeItem('userPreferences');
        localStorage.removeItem('cachedCourses');
        // Add any other items you want to clear
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log('Local data cleared');
    } catch (error) {
        console.error('Error clearing local data:', error);
    }
}

// ===========================
// Add animation styles
// ===========================
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(100px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(animationStyles);

console.log('Logout module loaded!');