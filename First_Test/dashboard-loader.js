import { getCurrentUserId } from './auth-guard.js';
import {
    getUserData,
    getUserTasks,
    getUserCourses,
    getUserResources,
    getAnnouncements,
    getUserChats,
    getUserEvents,
    getDashboardStats
} from './database-service.js';

// ===========================
// Load Dashboard Data
// ===========================
export async function loadDashboard() {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return;
    }

    try {
        console.log('Loading dashboard data for user:', userId);
        
        // Load all data in parallel
        const [stats, tasks, courses, resources, announcements, chats, events] = await Promise.all([
            getDashboardStats(userId),
            getUserTasks(userId),
            getUserCourses(userId),
            getUserResources(userId),
            getAnnouncements(),
            getUserChats(userId),
            getUserEvents(userId)
        ]);

        // Update UI with fetched data
        updateStatsCards(stats);
        updateTasksList(tasks);
        updateCoursesList(courses);
        updateResourcesList(resources);
        updateAnnouncementsList(announcements);
        updateChatsList(chats);
        updateEventsList(events);

        console.log('Dashboard loaded successfully!');
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ===========================
// Update Stats Cards
// ===========================
function updateStatsCards(stats) {
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards.length >= 4) {
        // Active Courses
        statCards[0].querySelector('h3').textContent = stats.activeCourses;
        
        // Pending Tasks
        statCards[1].querySelector('h3').textContent = stats.pendingTasks;
        
        // GPA
        statCards[2].querySelector('h3').textContent = stats.gpa.toFixed(1);
        
        // Attendance
        statCards[3].querySelector('h3').textContent = `${stats.attendance}%`;
    }
}

// ===========================
// Update Tasks List
// ===========================
function updateTasksList(tasks) {
    const taskList = document.querySelector('#dashboard .task-list');
    if (!taskList) return;

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Tasks Yet</h3>
                <p>Your assignments and tasks will appear here</p>
            </div>
        `;
        return;
    }

    // Sort tasks by due date and get first 4
    const sortedTasks = tasks
        .filter(task => !task.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 4);

    taskList.innerHTML = sortedTasks.map(task => `
        <div class="task-item ${task.priority === 'urgent' ? 'urgent' : ''}" data-task-id="${task.id}">
            <div class="task-check"></div>
            <div class="task-content">
                <h4>${task.title}</h4>
                <p>Due: ${formatDate(task.dueDate)}</p>
                <span class="task-tag ${task.priority === 'urgent' ? 'urgent' : ''}">${task.priority || 'Medium'}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers for checkboxes
    attachTaskCheckboxHandlers();
}

// ===========================
// Update Courses List (Full Section)
// ===========================
export function updateCoursesList(courses) {
    const coursesGrid = document.querySelector('#courses .courses-grid');
    if (!coursesGrid) return;

    if (courses.length === 0) {
        coursesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Courses Yet</h3>
                <p>Your enrolled courses will appear here</p>
            </div>
        `;
        return;
    }

    coursesGrid.innerHTML = courses.map(course => `
        <div class="course-card">
            <div class="course-header" style="background: ${course.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};">
                <h3>${course.name}</h3>
                <span class="course-code">${course.code}</span>
            </div>
            <div class="course-body">
                <p class="course-instructor">👨‍🏫 ${course.instructor}</p>
                <p class="course-schedule">📅 ${course.schedule}</p>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${course.progress || 0}%;"></div>
                    </div>
                    <span class="progress-text">${course.progress || 0}% Complete</span>
                </div>
            </div>
            <div class="course-footer">
                <button class="btn-course" data-course-id="${course.id}">View Course</button>
            </div>
        </div>
    `).join('');
}

// ===========================
// Update Resources List
// ===========================
function updateResourcesList(resources) {
    const resourceList = document.querySelector('#dashboard .resource-list');
    if (!resourceList) return;

    if (resources.length === 0) {
        resourceList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Resources Yet</h3>
                <p>Course materials will appear here</p>
            </div>
        `;
        return;
    }

    // Get first 3 resources
    const recentResources = resources.slice(0, 3);

    resourceList.innerHTML = recentResources.map(resource => `
        <div class="resource-item">
            <div class="resource-icon ${resource.type}">${getResourceIcon(resource.type)}</div>
            <div class="resource-content">
                <h4>${resource.title}</h4>
                <p>${formatDate(resource.uploadedAt)} • ${resource.size || 'N/A'}</p>
            </div>
            <button class="download-btn" data-resource-id="${resource.id}">
                ${resource.type === 'video' ? '▶️' : '⬇️'}
            </button>
        </div>
    `).join('');
}

// ===========================
// Update Announcements List
// ===========================
function updateAnnouncementsList(announcements) {
    const announcementList = document.querySelector('#dashboard .announcement-list');
    if (!announcementList) return;

    if (announcements.length === 0) {
        announcementList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📢</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Announcements</h3>
                <p>Updates will appear here</p>
            </div>
        `;
        return;
    }

    // Get first 3 announcements
    const recentAnnouncements = announcements.slice(0, 3);

    announcementList.innerHTML = recentAnnouncements.map(announcement => `
        <div class="announcement-item">
            <div class="announcement-icon">${announcement.icon || '📢'}</div>
            <div class="announcement-content">
                <h4>${announcement.title}</h4>
                <p>${announcement.message}</p>
                <span class="announcement-time">${formatTimeAgo(announcement.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// ===========================
// Update Chats List
// ===========================
function updateChatsList(chats) {
    const chatList = document.querySelector('#dashboard .chat-list');
    if (!chatList) return;

    if (chats.length === 0) {
        chatList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Chats Yet</h3>
                <p>Start a conversation</p>
            </div>
        `;
        return;
    }

    // Get first 3 chats
    const recentChats = chats.slice(0, 3);

    chatList.innerHTML = recentChats.map(chat => `
        <div class="chat-item ${chat.unread ? 'unread' : ''}">
            <div class="chat-avatar">${chat.initials || 'U'}</div>
            <div class="chat-content">
                <h4>${chat.name}</h4>
                <p>${chat.lastMessage}</p>
            </div>
            <span class="chat-time">${formatTimeAgo(chat.lastMessageTime)}</span>
        </div>
    `).join('');
}

// ===========================
// Update Events List
// ===========================
function updateEventsList(events) {
    const eventsList = document.querySelector('#dashboard .calendar-events');
    if (!eventsList) return;

    if (events.length === 0) {
        eventsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
                <p>No upcoming events</p>
            </div>
        `;
        return;
    }

    // Get first 2 upcoming events
    const upcomingEvents = events
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 2);

    eventsList.innerHTML = upcomingEvents.map(event => `
        <div class="event-item">
            <div class="event-date">
                <span class="date-day">${new Date(event.date).getDate()}</span>
                <span class="date-month">${new Date(event.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <p>${event.time} - ${event.location}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Helper Functions
// ===========================
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
        return 'Today, 11:59 PM';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow, 11:59 PM';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

function getResourceIcon(type) {
    const icons = {
        pdf: '📄',
        video: '🎥',
        doc: '📝',
        document: '📝'
    };
    return icons[type] || '📁';
}

function attachTaskCheckboxHandlers() {
    document.querySelectorAll('.task-check').forEach(checkbox => {
        checkbox.addEventListener('click', async function(e) {
            e.stopPropagation();
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            
            // Toggle visual state
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
            }
        });
    });
}

console.log('Dashboard loader initialized!');