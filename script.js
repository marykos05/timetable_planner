// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText('Сохранить').hide();

// Инициализация приложения
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || this.getDefaultCategories();
        this.currentDate = new Date();
        this.editingTaskId = null;
        this.selectedTaskId = null;
        
        this.init();
    }

    getDefaultCategories() {
        return [
            { id: 'study', name: 'Учеба', color: '#4CAF50' },
            { id: 'work', name: 'Работа', color: '#2196F3' },
            { id: 'home', name: 'Дом', color: '#FF9800' }
        ];
    }

    init() {
        this.setupEventListeners();
        this.renderCategories();
        this.renderTimeSlots();
        this.renderTasks();
        this.updateDateDisplay();
    }

    setupEventListeners() {
        // Кнопки навигации по датам
        document.getElementById('prevDay').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.updateDateDisplay();
            this.renderTasks();
        });

        document.getElementById('nextDay').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.updateDateDisplay();
            this.renderTasks();
        });

        // Кнопка добавления задачи
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.openTaskModal();
        });

        document.getElementById('addFirstTask').addEventListener('click', () => {
            this.openTaskModal();
        });

        // Фильтр категорий
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.renderTasks(e.target.value);
        });

        // Модальные окна
        document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        document.querySelector('.close-action-modal').addEventListener('click', () => {
            this.closeActionModal();
        });

        // Формы
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCategory();
        });

        // Переключение уведомлений
        document.getElementById('taskNotification').addEventListener('change', (e) => {
            document.getElementById('notificationTimeGroup').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        // Кнопка новой категории
        document.getElementById('newCategoryBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });

        // Действия с задачами
        document.getElementById('editTaskBtn').addEventListener('click', () => {
            this.editTask();
        });

        document.getElementById('moveTaskBtn').addEventListener('click', () => {
            this.moveTask();
        });

        document.getElementById('deleteTaskBtn').addEventListener('click', () => {
            this.deleteTask();
        });

        // Закрытие модальных окон по клику вне
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Очистка предупреждений
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.clearTimeWarnings();
        });
    }

    updateDateDisplay() {
        const dateElement = document.getElementById('currentDate');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateStr = this.currentDate.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        if (this.currentDate.toDateString() === today.toDateString()) {
            dateElement.textContent = `Сегодня, ${dateStr}`;
        } else if (this.currentDate.toDateString() === yesterday.toDateString()) {
            dateElement.textContent = `Вчера, ${dateStr}`;
        } else if (this.currentDate.toDateString() === tomorrow.toDateString()) {
            dateElement.textContent = `Завтра, ${dateStr}`;
        } else {
            dateElement.textContent = dateStr;
        }
    }

    renderCategories() {
        const filterSelect = document.getElementById('categoryFilter');
        const taskSelect = document.getElementById('taskCategory');
        
        while (filterSelect.children.length > 1) filterSelect.removeChild(filterSelect.lastChild);
        taskSelect.innerHTML = '';

        this.categories.forEach(category => {
            const filterOption = document.createElement('option');
            filterOption.value = category.id;
            filterOption.textContent = category.name;
            filterSelect.appendChild(filterOption);

            const taskOption = document.createElement('option');
            taskOption.value = category.id;
            taskOption.textContent = category.name;
            taskOption.style.color = category.color;
            taskSelect.appendChild(taskOption);
        });
    }

    renderTimeSlots() {
        const timeSlotsContainer = document.querySelector('.time-slots');
        timeSlotsContainer.innerHTML = '';

        for (let hour = 8; hour <= 22; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            timeSlotsContainer.appendChild(timeSlot);
        }
    }

    renderTasks(filterCategory = 'all') {
        const tasksList = document.getElementById('tasksList');
        const noTasks = document.getElementById('noTasks');
        
        tasksList.innerHTML = '';

        const selectedDateStr = this.currentDate.toISOString().split('T')[0];
        let filteredTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split('T')[0];
            const dateMatch = taskDate === selectedDateStr;
            const categoryMatch = filterCategory === 'all' || task.category === filterCategory;
            return dateMatch && categoryMatch;
        });

        filteredTasks.sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

        if (filteredTasks.length === 0) {
            noTasks.style.display = 'block';
            return;
        }

        noTasks.style.display = 'none';

        const tasksByHour = {};
        for (let hour = 8; hour <= 22; hour++) {
            tasksByHour[hour] = [];
        }

        filteredTasks.forEach(task => {
            const hour = parseInt(task.time.split(':')[0]);
            if (hour >= 8 && hour <= 22) {
                tasksByHour[hour].push(task);
            }
        });

        for (let hour = 8; hour <= 22; hour++) {
            const hourBlock = document.createElement('div');
            hourBlock.className = 'hour-block';
            hourBlock.dataset.hour = hour;

            tasksByHour[hour].forEach(task => {
                const taskElement = this.createTaskElement(task);
                hourBlock.appendChild(taskElement);
            });

            tasksList.appendChild(hourBlock);
        }
    }

    createTaskElement(task) {
    const category = this.categories.find(c => c.id === task.category);
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.dataset.taskId = task.id;
    taskElement.style.borderLeftColor = category.color;

    taskElement.innerHTML = `
        <div class="task-header">
            <div style="flex: 1;">
                <div class="task-title-container">
                    <span class="task-checkmark">✓</span>
                    <span class="task-title-text">${task.title}</span>
                </div>
                <div class="task-time">${task.time}</div>
            </div>
            <button class="task-btn more-btn" data-task-id="${task.id}">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        <div class="task-category" style="background: ${category.color}">
            ${category.name}
        </div>
        <div class="task-actions">
            <button class="task-btn complete-btn" data-task-id="${task.id}"></button>
        </div>
    `;

    taskElement.querySelector('.more-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedTaskId = task.id;
        this.openActionModal(e);
    });

    taskElement.querySelector('.complete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTaskComplete(task.id);
    });

    taskElement.addEventListener('click', (e) => {
        if (!e.target.closest('.task-btn')) {
            this.selectedTaskId = task.id;
            this.openTaskModal(true);
        }
    });

    return taskElement;
}

   
    toggleTaskComplete(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].completed = !this.tasks[taskIndex].completed;
            this.saveToStorage();

            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                const checkmark = taskElement.querySelector('.task-checkmark');
                const titleText = taskElement.querySelector('.task-title-text');
                
                if (this.tasks[taskIndex].completed) {
                    checkmark.textContent = '✓';
                    taskElement.classList.add('completed');
                    titleText.style.textDecoration = 'line-through';
                    titleText.style.opacity = '0.7';
                } else {
                    checkmark.textContent = '';
                    taskElement.classList.remove('completed');
                    titleText.style.textDecoration = 'none';
                    titleText.style.opacity = '1';
                }
            }
        }
    }

    openTaskModal(editMode = false) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('taskForm');
        const saveBtn = document.getElementById('saveTaskBtn');

        this.clearTimeWarnings();

        if (editMode && this.selectedTaskId) {
            const task = this.tasks.find(t => t.id === this.selectedTaskId);
            if (task) {
                this.editingTaskId = task.id;
                title.textContent = 'Редактировать задачу';
                saveBtn.textContent = 'Сохранить изменения';
                
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDate').value = task.date;
                document.getElementById('taskTime').value = task.time;
                document.getElementById('taskCategory').value = task.category;
                document.getElementById('taskDescription').value = task.description || '';
                
                if (task.notification) {
                    document.getElementById('taskNotification').checked = true;
                    document.getElementById('notificationTimeGroup').style.display = 'block';
                    document.getElementById('notificationTime').value = task.notificationTime || '15';
                }
            }
        } else {
            this.editingTaskId = null;
            title.textContent = 'Новая задача';
            saveBtn.textContent = 'Создать задачу';
            form.reset();
            
            const today = this.currentDate.toISOString().split('T')[0];
            document.getElementById('taskDate').value = today;
            document.getElementById('notificationTimeGroup').style.display = 'none';
        }

        modal.classList.add('show');
        
        setTimeout(() => {
            this.checkTimeConflict();
        }, 100);
    }

    openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        modal.classList.add('show');
    }

    openActionModal(event) {
        const modal = document.getElementById('actionModal');
        const rect = event.target.getBoundingClientRect();
        modal.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        modal.classList.add('show');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
        this.closeActionModal();
        this.editingTaskId = null;
        this.selectedTaskId = null;
        this.clearTimeWarnings();
    }

    clearTimeWarnings() {
        const warnings = document.querySelectorAll('.warning');
        warnings.forEach(warning => warning.remove());
    }

    closeActionModal() {
        document.getElementById('actionModal').classList.remove('show');
    }

    
    checkTimeConflict() {
        const date = document.getElementById('taskDate').value;
        const time = document.getElementById('taskTime').value;
        
        if (!date || !time) return;

        const conflictingTask = this.tasks.find(task => {
            if (this.editingTaskId && task.id === this.editingTaskId) return false;
            const taskDate = task.date;
            if (taskDate !== date) return false;
            return task.time === time;
        });

        if (conflictingTask) {
            let warningElement = document.querySelector('.warning');
            if (!warningElement) {
                warningElement = document.createElement('div');
                warningElement.className = 'warning';
                document.getElementById('taskTime').parentNode.appendChild(warningElement);
            }
            warningElement.textContent = `⚠️ Конфликт времени с задачей "${conflictingTask.title}" (${conflictingTask.time})`;
            warningElement.classList.add('show');
        } else {
            const warningElement = document.querySelector('.warning');
            if (warningElement) {
                warningElement.remove();
            }
        }
    }

    async saveTask() {
        const form = document.getElementById('taskForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const taskData = {
            id: this.editingTaskId || Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            date: document.getElementById('taskDate').value,
            time: document.getElementById('taskTime').value,
            category: document.getElementById('taskCategory').value,
            description: document.getElementById('taskDescription').value,
            completed: false,
            createdAt: new Date().toISOString(),
            notification: document.getElementById('taskNotification').checked,
            notificationTime: document.getElementById('taskNotification').checked 
                ? parseInt(document.getElementById('notificationTime').value) 
                : null
        };

        const conflict = this.checkTimeConflictForTask(taskData, this.editingTaskId);
        if (conflict) {
            if (!confirm(`Конфликт времени с задачей "${conflict.title}" (${conflict.time}). Все равно сохранить?`)) {
                return;
            }
        }

        if (this.editingTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (index !== -1) {
                this.tasks[index] = { ...this.tasks[index], ...taskData };
            }
        } else {
            this.tasks.push(taskData);
        }

        this.saveToStorage();
        this.closeAllModals();
        this.renderTasks();
        
        if (taskData.notification && taskData.notificationTime) {
            this.scheduleNotification(taskData);
        }
    }

   
    checkTimeConflictForTask(taskData, editingTaskId = null) {
        return this.tasks.find(task => {
            if (editingTaskId && task.id === editingTaskId) return false;
            if (task.date !== taskData.date) return false;
            return task.time === taskData.time;
        });
    }

    createCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;
        if (!name) return;
        if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            alert('Категория с таким именем уже существует');
            return;
        }
        const newCategory = {
            id: 'custom_' + Date.now().toString(),
            name: name,
            color: color
        };
        this.categories.push(newCategory);
        this.saveToStorage();
        this.renderCategories();
        this.closeAllModals();
    }

    editTask() {
        this.closeActionModal();
        this.openTaskModal(true);
    }

    moveTask() {
        const task = this.tasks.find(t => t.id === this.selectedTaskId);
        if (!task) return;

        const newDate = prompt('Введите новую дату (ГГГГ-ММ-ДД):', task.date);
        if (!newDate) return;

        const newTime = prompt('Введите новое время (ЧЧ:ММ):', task.time);
        if (!newTime) return;

        if (!/^\d{2}:\d{2}$/.test(newTime)) {
            alert('Неверный формат времени');
            return;
        }

        const tempTask = { ...task, date: newDate, time: newTime };
        const conflict = this.checkTimeConflictForTask(tempTask, task.id);
        if (conflict) {
            alert(`Конфликт времени с задачей "${conflict.title}" (${conflict.time})`);
            return;
        }

        task.date = newDate;
        task.time = newTime;
        this.saveToStorage();
        this.renderTasks();
        this.closeActionModal();
    }

    deleteTask() {
        if (confirm('Удалить эту задачу?')) {
            this.tasks = this.tasks.filter(t => t.id !== this.selectedTaskId);
            this.saveToStorage();
            this.renderTasks();
            this.closeActionModal();
        }
    }

    scheduleNotification(task) {
        const taskDate = new Date(`${task.date}T${task.time}`);
        const notificationTime = new Date(taskDate.getTime() - task.notificationTime * 60000);
        console.log(`Напоминание для задачи "${task.title}" запланировано на`, notificationTime);
        task.notificationId = `notif_${task.id}`;
        this.saveToStorage();
    }

    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
    
    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('Пользователь:', user.first_name);
    }
    
    document.getElementById('taskTime').addEventListener('change', () => {
        window.taskManager.checkTimeConflict();
    });
    
    document.getElementById('taskTime').addEventListener('input', () => {
        window.taskManager.checkTimeConflict();
    });
    
    document.getElementById('taskDate').addEventListener('change', () => {
        window.taskManager.checkTimeConflict();
    });
});


