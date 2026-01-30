import { injectNavIcons } from './icons.js';
import { themeManager } from './theme-manager.js';
import { handleLogout } from './auth-logout.js';

// Initialize icons when page loads
document.addEventListener('DOMContentLoaded', () => {
    injectNavIcons();
    setupProfileDropdown();
    handleHashNavigation();
    console.log('Icons, theme, and dropdown initialized!');
});

// ===========================
// Hash Navigation Handler
// ===========================
function handleHashNavigation() {
    // Handle hash on page load
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        navigateToSection(sectionId);
    }
    
    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const sectionId = window.location.hash.substring(1);
        navigateToSection(sectionId);
    });
}

// ===========================
// Profile Dropdown Menu
// ===========================
function setupProfileDropdown() {
    const profileBtn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('profileDropdown');
    
    if (!profileBtn || !dropdown) return;
    
    // Toggle dropdown
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileBtn.classList.toggle('active');
        dropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
            profileBtn.classList.remove('active');
            dropdown.classList.remove('active');
        }
    });
    
    // Handle dropdown item clicks
    const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const action = item.dataset.action;
            
            if (action === 'profile') {
                // Let default href=#profile work
                profileBtn.classList.remove('active');
                dropdown.classList.remove('active');
            } else if (action === 'settings') {
                // Let default behavior handle navigation
                profileBtn.classList.remove('active');
                dropdown.classList.remove('active');
            } else if (action === 'logout') {
                e.preventDefault();
                profileBtn.classList.remove('active');
                dropdown.classList.remove('active');
                handleLogout(); // Use the new logout handler
            } else if (action === 'help') {
                e.preventDefault();
                alert('Help & Support - Coming soon!');
                profileBtn.classList.remove('active');
                dropdown.classList.remove('active');
            }
        });
    });
}

function navigateToSection(sectionId) {
    // Remove active class from all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Add active class to target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Initialize profile if navigating to profile section
        if (sectionId === 'profile') {
            // Import and initialize profile dynamically
            import('./profile-manager.js').then(module => {
                module.initializeProfile();
            }).catch(error => {
                console.error('Error loading profile manager:', error);
            });
        }
    }
    
    // Update sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`a[href="#${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Scroll to top of main content
    document.querySelector('.main-content').scrollTop = 0;
}

// ===========================
// Navigation & Sidebar - Tab System
// ===========================

// Handle navigation item clicks for tab switching
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Get the section ID from href (e.g., #dashboard -> dashboard)
        const sectionId = this.getAttribute('href').substring(1);
        
        // Special handling for logout
        if (sectionId === 'logout') {
            handleLogout(); // Use the new logout handler
            return;
        }
        
        // Use the navigateToSection function
        navigateToSection(sectionId);
        
        // Update the URL hash
        window.location.hash = sectionId;
        
        console.log(`Switched to: ${sectionId}`);
        showNotification(`Switched to ${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`);
    });
});

// ===========================
// Task Management
// ===========================

// Handle task checkbox clicks
document.querySelectorAll('.task-check').forEach(checkbox => {
    checkbox.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const taskItem = this.closest('.task-item');
        
        // Toggle completed state
        if (this.classList.contains('completed')) {
            this.classList.remove('completed');
            this.style.background = 'none';
            this.style.border = '2px solid var(--border)';
            this.innerHTML = '';
            taskItem.style.opacity = '1';
        } else {
            this.classList.add('completed');
            this.style.background = 'var(--success-color)';
            this.style.border = '2px solid var(--success-color)';
            this.innerHTML = '✓';
            this.style.color = 'white';
            taskItem.style.opacity = '0.6';
            
            showNotification('Task completed! 🎉');
        }
    });
});

// Handle task item clicks
document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', function() {
        const taskTitle = this.querySelector('h4').textContent;
        console.log(`Opening task: ${taskTitle}`);
    });
});

// ===========================
// Resource Downloads
// ===========================

document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const resourceName = this.closest('.resource-item').querySelector('h4').textContent;
        
        if (this.textContent.includes('▶️')) {
            console.log(`Playing video: ${resourceName}`);
            showNotification(`Opening video: ${resourceName}`);
        } else {
            console.log(`Downloading: ${resourceName}`);
            showNotification(`Downloading: ${resourceName}`);
        }
        
        this.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
    });
});

// ===========================
// Chat Functionality
// ===========================

document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', function() {
        const chatName = this.querySelector('h4').textContent;
        console.log(`Opening chat with: ${chatName}`);
        
        if (this.classList.contains('unread')) {
            this.classList.remove('unread');
            updateNotificationCount(-1);
        }
        
        showNotification(`Opening chat with ${chatName}`);
    });
});

// ===========================
// Search Functionality
// ===========================

const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        console.log(`Searching for: ${searchTerm}`);
        
        if (searchTerm.length > 2) {
            highlightSearchResults(searchTerm);
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = e.target.value;
            console.log(`Search submitted: ${searchTerm}`);
            showNotification(`Searching for: ${searchTerm}`);
        }
    });
}

// ===========================
// Notifications
// ===========================

const notificationIcon = document.querySelector('.notifications');
if (notificationIcon) {
    notificationIcon.addEventListener('click', function() {
        console.log('Opening notifications');
        showNotification('You have 3 new notifications');
    });
}

function updateNotificationCount(change) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        let currentCount = parseInt(badge.textContent);
        currentCount += change;
        badge.textContent = currentCount;
        
        if (currentCount <= 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
        }
    }
}

// ===========================
// Announcement Interactions
// ===========================

document.querySelectorAll('.announcement-item').forEach(item => {
    item.addEventListener('click', function() {
        const title = this.querySelector('h4').textContent;
        console.log(`Opening announcement: ${title}`);
        showNotification(`Opening: ${title}`);
    });
});

// ===========================
// Event Calendar
// ===========================

document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', function() {
        const eventTitle = this.querySelector('h4').textContent;
        console.log(`Opening event: ${eventTitle}`);
        showNotification(`Event: ${eventTitle}`);
    });
});

// ===========================
// Utility Functions
// ===========================

function showNotification(message) {
    const existingNotif = document.querySelector('.toast-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'toast-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--dark);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideInUp 0.3s ease;
        font-size: 0.9rem;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function highlightSearchResults(searchTerm) {
    console.log(`Highlighting results for: ${searchTerm}`);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100px);
            opacity: 0;
        }
    }
    
    .toast-notification {
        font-family: 'Poppins', sans-serif;
    }
`;
document.head.appendChild(style);

// ===========================
// View All Links
// ===========================

document.querySelectorAll('.view-all').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const sectionName = this.closest('.card').querySelector('h2').textContent;
        console.log(`Viewing all: ${sectionName}`);
        showNotification(`Loading all ${sectionName}...`);
    });
});

// ===========================
// Stats Cards Animation
// ===========================

const statCards = document.querySelectorAll('.stat-card');
statCards.forEach((card, index) => {
    card.style.opacity = '0';
    setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
    }, index * 100);
});

// ===========================
// Welcome Message
// ===========================

function updateGreeting() {
    const welcomeSection = document.querySelector('.welcome-section h1');
    if (welcomeSection) {
        const hour = new Date().getHours();
        let greeting = 'Welcome back';
        
        if (hour < 12) {
            greeting = 'Good morning';
        } else if (hour < 18) {
            greeting = 'Good afternoon';
        } else {
            greeting = 'Good evening';
        }
        
        welcomeSection.innerHTML = `${greeting}, Juan! 👋`;
    }
}

updateGreeting();

// ===========================
// Console Welcome Message
// ===========================

console.log(`
╔══════════════════════════════════════╗
║   LSPU Engineering Portal v1.0      ║
║   Student Dashboard System          ║
╚══════════════════════════════════════╝

Welcome to the engineering portal!
All interactive features are working.
`);

// ===========================
// Load Data
// ===========================

function loadDashboardData() {
    console.log('Loading dashboard data...');
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    console.log('Dashboard loaded successfully!');
});