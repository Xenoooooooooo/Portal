// ===========================
// Task & Dashboard Module
// Merged: task-manager.js + dashboard-loader.js
// ===========================
import { getCurrentUserId } from './auth.js';
import { 
    getUserTasks, 
    addTask, 
    updateTaskStatus,
    getUserData,
    getUserCourses,
    getUserResources,
    getAnnouncements,
    getUserChats,
    getUserEvents,
    getDashboardStats,
    database
} from './firebase-service.js';
import { ref, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let currentTasks = [];
let currentFilter = 'All Tasks';
let isLoading = false;

// ===========================
// Toast Notification System
// ===========================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? `background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;` : ''}
        ${type === 'error' ? `background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white;` : ''}
        ${type === 'info' ? `background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;` : ''}
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .task-item-full { animation: fadeInUp 0.3s ease; }
    .skeleton { animation: pulse 2s infinite; background: linear-gradient(90deg, var(--light) 25%, rgba(255, 255, 255, 0.2) 50%, var(--light) 75%); background-size: 200% 100%; }
`;
document.head.appendChild(style);

// ===========================
// Dashboard Loading
// ===========================
export async function loadDashboard() {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return;
    }

    try {
        console.log('Loading dashboard data for user:', userId);
        
        const [stats, tasks, courses, resources, announcements, chats, events] = await Promise.all([
            getDashboardStats(userId),
            getUserTasks(userId),
            getUserCourses(userId),
            getUserResources(userId),
            getAnnouncements(),
            getUserChats(userId),
            getUserEvents(userId)
        ]);

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
        statCards[0].querySelector('h3').textContent = stats.activeCourses;
        statCards[1].querySelector('h3').textContent = stats.pendingTasks;
        statCards[2].querySelector('h3').textContent = stats.gpa.toFixed(1);
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
        taskList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📝</div><h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Tasks Yet</h3><p>Your assignments will appear here</p></div>`;
        return;
    }

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

    attachTaskCheckboxHandlers();
}

// ===========================
// Update Courses List
// ===========================
export function updateCoursesList(courses) {
    const coursesGrid = document.querySelector('#courses .courses-grid');
    if (!coursesGrid) return;

    if (courses.length === 0) {
        coursesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📚</div><h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Courses Yet</h3></div>`;
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
        resourceList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📁</div><h3>No Resources Yet</h3></div>`;
        return;
    }

    const recentResources = resources.slice(0, 3);
    resourceList.innerHTML = recentResources.map(resource => `
        <div class="resource-item">
            <div class="resource-icon ${resource.type}">${getResourceIcon(resource.type)}</div>
            <div class="resource-content">
                <h4>${resource.title}</h4>
                <p>${formatDate(resource.uploadedAt)}</p>
            </div>
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
        announcementList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📢</div><h3>No Announcements</h3></div>`;
        return;
    }

    const recentAnnouncements = announcements.slice(0, 3);
    announcementList.innerHTML = recentAnnouncements.map(announcement => `
        <div class="announcement-item">
            <div class="announcement-icon">${announcement.icon || '📢'}</div>
            <div class="announcement-content">
                <h4>${announcement.title}</h4>
                <p>${announcement.message}</p>
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
        chatList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">💬</div><h3>No Chats Yet</h3></div>`;
        return;
    }

    const recentChats = chats.slice(0, 3);
    chatList.innerHTML = recentChats.map(chat => `
        <div class="chat-item ${chat.unread ? 'unread' : ''}">
            <div class="chat-avatar">${chat.initials || 'U'}</div>
            <div class="chat-content">
                <h4>${chat.name}</h4>
                <p>${chat.lastMessage}</p>
            </div>
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
        eventsList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><p>No upcoming events</p></div>`;
        return;
    }

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
                <p>${event.time}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Task Manager Initialization
// ===========================
export async function initializeTaskManager() {
    console.log('Initializing Task Manager...');
    
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        showToast('Please log in to view tasks', 'error');
        return;
    }

    showLoadingState();
    await loadTasksFromDatabase(userId);
    
    setupMainAddTaskButton();
    setupFilterButtons();
    setupTaskEventListeners();
    setupKeyboardShortcuts();
    
    isLoading = false;
    console.log('Task Manager initialized!');
}

// ===========================
// Load Tasks from Database
// ===========================
async function loadTasksFromDatabase(userId) {
    try {
        const tasks = await getUserTasks(userId);
        currentTasks = tasks;
        renderTasks(currentFilter);
        console.log('Tasks loaded:', tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Failed to load tasks', 'error');
    }
}

// ===========================
// Render Tasks
// ===========================
function renderTasks(filterType) {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;

    const filteredTasks = filterTasksByType(filterType);
    taskList.innerHTML = '';
    
    if (currentTasks.length === 0) {
        taskList.innerHTML = `<div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);"><div style="font-size: 3.5rem; margin-bottom: 1rem;">📋</div><h3 style="color: var(--text-primary);">No tasks yet</h3></div>`;
        return;
    }
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `<div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);"><div style="font-size: 3.5rem; margin-bottom: 1rem;">✨</div><h3 style="color: var(--text-primary);">No tasks in this filter</h3></div>`;
        return;
    }
    
    filteredTasks.forEach((task, index) => {
        const taskElement = createTaskElement(task);
        taskElement.style.animationDelay = `${index * 0.05}s`;
        taskList.appendChild(taskElement);
    });

    console.log(`Rendered ${filteredTasks.length} tasks`);
}

// ===========================
// Filter Tasks
// ===========================
function filterTasksByType(filterType) {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return currentTasks.filter(task => {
        switch(filterType) {
            case 'All Tasks': return true;
            case 'Urgent': return task.priority === 'Urgent';
            case 'This Week':
                const dueDate = new Date(task.dueDate);
                return dueDate >= now && dueDate <= oneWeekFromNow;
            case 'Completed': return task.completed === true;
            default: return true;
        }
    });
}

// ===========================
// Create Task Element
// ===========================
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item-full ${task.priority === 'Urgent' ? 'urgent' : ''} ${task.completed ? 'completed' : ''}`;
    taskDiv.setAttribute('data-task-id', task.id);

    const dueDate = new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    taskDiv.innerHTML = `
        <div class="task-check ${task.completed ? 'checked' : ''}" style="cursor: pointer;"></div>
        <div class="task-content-full" style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">${task.title}</h3>
            <p class="task-description" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">${task.description || 'No description'}</p>
            <div class="task-meta" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <span class="task-course" style="font-size: 0.85rem; color: var(--text-secondary);">📚 ${task.course || 'General'}</span>
                <span class="task-due" style="font-size: 0.85rem; color: var(--text-secondary);">📅 Due: ${dueDate}</span>
                <span class="task-tag ${task.priority === 'Urgent' ? 'urgent' : ''}" style="display: inline-block; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; ${task.priority === 'Urgent' ? 'background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b;' : 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af;'}">${task.priority || 'Normal'}</span>
            </div>
        </div>
        <button class="task-delete-btn" style="background: rgba(239, 68, 68, 0.05); border: 2px solid transparent; color: var(--danger-color); padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 1.2rem; transition: all 0.3s ease; flex-shrink: 0;">🗑️</button>
    `;

    const checkbox = taskDiv.querySelector('.task-check');
    const deleteBtn = taskDiv.querySelector('.task-delete-btn');

    checkbox.addEventListener('click', () => toggleTaskCompletion(task.id, !task.completed));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return taskDiv;
}

// ===========================
// Setup Main Add Task Button
// ===========================
function setupMainAddTaskButton() {
    const mainAddTaskBtn = document.getElementById('mainAddTaskBtn');
    if (mainAddTaskBtn) {
        mainAddTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddTaskModal();
        });
    }
}

// ===========================
// Show Add Task Modal
// ===========================
function showAddTaskModal() {
    const overlay = document.createElement('div');
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
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modal.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary);">Add New Task</h2>
        <form id="addTaskForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Task Title *</label>
                <input type="text" id="taskTitle" required placeholder="Enter task title" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--white);">
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Description</label>
                <textarea id="taskDescription" placeholder="Enter description" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--white); resize: vertical; min-height: 80px;"></textarea>
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Course/Subject</label>
                <input type="text" id="taskCourse" placeholder="e.g., ENGR 301" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--white);">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Due Date *</label>
                    <input type="date" id="taskDueDate" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--white);">
                </div>
                <div>
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Priority</label>
                    <select id="taskPriority" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--white);">
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" id="cancelBtn" style="flex: 1; padding: 0.75rem; background: var(--light); border: 2px solid var(--border); border-radius: 8px; color: var(--text-primary); font-weight: 600; cursor: pointer; transition: all 0.3s ease;">Cancel</button>
                <button type="submit" style="flex: 1; padding: 0.75rem; background: var(--primary-color); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">Add Task</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#addTaskForm');
    const cancelBtn = modal.querySelector('#cancelBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = modal.querySelector('#taskTitle');
        const dueDateInput = modal.querySelector('#taskDueDate');
        
        if (!titleInput.value.trim()) {
            showToast('Please enter a task title', 'error');
            titleInput.focus();
            return;
        }
        
        if (!dueDateInput.value) {
            showToast('Please select a due date', 'error');
            dueDateInput.focus();
            return;
        }
        
        const userId = getCurrentUserId();
        const taskData = {
            title: titleInput.value.trim(),
            description: modal.querySelector('#taskDescription').value.trim(),
            course: modal.querySelector('#taskCourse').value.trim(),
            dueDate: dueDateInput.value,
            priority: modal.querySelector('#taskPriority').value,
            completed: false
        };

        try {
            await addTask(userId, taskData);
            await loadTasksFromDatabase(userId);
            showToast('Task created successfully!', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('Failed to add task', 'error');
        } finally {
            overlay.remove();
        }
    });
}

// ===========================
// Toggle Task Completion
// ===========================
async function toggleTaskCompletion(taskId, completed) {
    const userId = getCurrentUserId();
    
    try {
        await updateTaskStatus(userId, taskId, completed);
        
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            renderTasks(currentFilter);
            showToast(completed ? 'Task completed!' : 'Task marked incomplete', 'success');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Failed to update task', 'error');
    }
}

// ===========================
// Delete Task
// ===========================
async function deleteTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    
    const overlay = document.createElement('div');
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
    modal.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    `;

    modal.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: var(--text-primary); margin-bottom: 0.5rem;">Delete Task?</h2>
            <p style="color: var(--text-secondary);">Are you sure you want to delete "${task?.title || 'Task'}"?</p>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button id="cancelDeleteBtn" style="flex: 1; padding: 0.75rem; background: var(--light); border: 2px solid var(--border); border-radius: 8px; color: var(--text-primary); font-weight: 600; cursor: pointer;">Cancel</button>
            <button id="confirmDeleteBtn" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Delete</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('#cancelDeleteBtn');
    const confirmBtn = modal.querySelector('#confirmDeleteBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener('click', async () => {
        overlay.remove();
        try {
            const userId = getCurrentUserId();
            const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
            await remove(taskRef);
            
            currentTasks = currentTasks.filter(t => t.id !== taskId);
            renderTasks(currentFilter);
            showToast('Task deleted!', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Failed to delete task', 'error');
        }
    });
}

// ===========================
// Setup Filter Buttons
// ===========================
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.textContent.trim();
            renderTasks(currentFilter);
        });
    });
}

// ===========================
// Setup Task Event Listeners
// ===========================
function setupTaskEventListeners() {
    console.log('Task event listeners setup complete');
}

// ===========================
// Setup Keyboard Shortcuts
// ===========================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            showAddTaskModal();
        }
        
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('[style*="position: fixed"]');
            modals.forEach(modal => {
                if (modal.style.zIndex > 9000) modal.remove();
            });
        }
    });
}

// ===========================
// Loading Skeleton
// ===========================
function createTaskSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'task-item-full skeleton';
    skeleton.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        gap: 1rem;
    `;
    skeleton.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 4px; background: var(--border); flex-shrink: 0;"></div>
        <div style="flex: 1;">
            <div style="height: 20px; background: var(--border); border-radius: 4px; margin-bottom: 0.5rem; width: 60%;"></div>
            <div style="height: 16px; background: var(--border); border-radius: 4px; margin-bottom: 1rem; width: 80%;"></div>
            <div style="display: flex; gap: 1rem;">
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 100px;"></div>
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 120px;"></div>
            </div>
        </div>
    `;
    return skeleton;
}

function showLoadingState() {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        taskList.appendChild(createTaskSkeleton());
    }
    isLoading = true;
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

function getResourceIcon(type) {
    const icons = { pdf: '📄', video: '🎥', doc: '📝', document: '📝' };
    return icons[type] || '📁';
}

function attachTaskCheckboxHandlers() {
    document.querySelectorAll('.task-check').forEach(checkbox => {
        checkbox.addEventListener('click', async function(e) {
            e.stopPropagation();
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            
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

console.log('Task & Dashboard module loaded!');
