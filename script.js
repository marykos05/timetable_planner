// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText('Сохранить').hide();

class TaskManager {
    constructor() {
        this.tasks = [];
        this.categories = [];
        this.currentDate = new Date();
        this.editingTaskId = null;
        this.selectedTaskId = null;
        this.currentFilter = 'all';
        this.loadFromStorage();
        this.init();
    }

    loadFromStorage() {
        try {
            const tasksRaw = localStorage.getItem('tasks');
            const categoriesRaw = localStorage.getItem('categories');
            this.tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
            this.categories = categoriesRaw ? JSON.parse(categoriesRaw) : this.getDefaultCategories();
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
            this.tasks = [];
            this.categories = this.getDefaultCategories();
        }
    }

    getDefaultCategories() {
        return [
            { id: 'study', name: 'Учёба', color: '#4CAF50' },
            { id: 'work', name: 'Работа', color: '#2196F3' },
            { id: 'home', name: 'Дом', color: '#FF9800' }
        ];
    }

    init() {
        this.setupEventListeners();
        this.renderCategories();
        this.renderTimeSlots();
        this.renderTasks(this.currentFilter);
        this.updateDateDisplay();
    }

    setupEventListeners() {
        document.getElementById('prevDay').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.updateDateDisplay();
            this.renderTasks(this.currentFilter);
        });

        document.getElementById('nextDay').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.updateDateDisplay();
            this.renderTasks(this.currentFilter);
        });

        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('addFirstTask').addEventListener('click', () => this.openTaskModal());

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderTasks(this.currentFilter);
        });

        document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        document.querySelector('.close-action-modal').addEventListener('click', () => this.closeActionModal());

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCategory();
        });

        document.getElementById('newCategoryBtn').addEventListener('click', () => this.openCategoryModal());

        document.getElementById('editTaskBtn').addEventListener('click', () => this.editTask());
        document.getElementById('moveTaskBtn').addEventListener('click', () => this.moveTask());
        document.getElementById('deleteTaskBtn').addEventListener('click', () => this.deleteTask());

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeAllModals();
            });
        });
    }

    updateDateDisplay() {
        const el = document.getElementById('currentDate');
        const today = new Date();
        const dateStr = this.currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        if (this.currentDate.toDateString() === today.toDateString()) {
            el.textContent = `Сегодня, ${dateStr}`;
        } else if (this.currentDate.toDateString() === new Date(Date.now() - 86400000).toDateString()) {
            el.textContent = `Вчера, ${dateStr}`;
        } else if (this.currentDate.toDateString() === new Date(Date.now() + 86400000).toDateString()) {
            el.textContent = `Завтра, ${dateStr}`;
        } else {
            el.textContent = dateStr;
        }
    }

    renderCategories() {
        const filter = document.getElementById('categoryFilter');
        const task = document.getElementById('taskCategory');
        while (filter.children.length > 1) filter.removeChild(filter.lastChild);
        task.innerHTML = '';
        this.categories.forEach(cat => {
            const opt1 = document.createElement('option');
            opt1.value = cat.id;
            opt1.textContent = cat.name;
            filter.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = cat.id;
            opt2.textContent = cat.name;
            opt2.style.color = cat.color;
            task.appendChild(opt2);
        });
    }

    renderTimeSlots() {
        const container = document.querySelector('.time-slots');
        container.innerHTML = '';
        for (let h = 8; h <= 22; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = `${h.toString().padStart(2, '0')}:00`;
            container.appendChild(slot);
        }
    }

    renderTasks(filter = 'all') {
        const list = document.getElementById('tasksList');
        const noTasks = document.getElementById('noTasks');
        list.innerHTML = '';

        const dateStr = this.currentDate.toISOString().split('T')[0];
        let tasks = this.tasks.filter(t => {
            const taskDate = new Date(t.date).toISOString().split('T')[0];
            return taskDate === dateStr && (filter === 'all' || t.category === filter);
        });

        tasks.sort((a, b) => {
            const [ah, am] = a.time.split(':').map(Number);
            const [bh, bm] = b.time.split(':').map(Number);
            return (ah * 60 + am) - (bh * 60 + bm);
        });

        if (tasks.length === 0) {
            noTasks.style.display = 'block';
            return;
        }
        noTasks.style.display = 'none';

        const byHour = {};
        for (let h = 8; h <= 22; h++) byHour[h] = [];
        tasks.forEach(t => {
            const h = parseInt(t.time.split(':')[0]);
            if (h >= 8 && h <= 22) byHour[h].push(t);
        });

        for (let h = 8; h <= 22; h++) {
            const block = document.createElement('div');
            block.className = 'hour-block';
            byHour[h].forEach(task => block.appendChild(this.createTaskElement(task)));
            list.appendChild(block);
        }
    }

    createTaskElement(task) {
        const cat = this.categories.find(c => c.id === task.category);
        const el = document.createElement('div');
        el.className = `task-item ${task.completed ? 'completed' : ''}`;
        el.dataset.taskId = task.id;
        el.style.borderLeftColor = cat.color;

        el.innerHTML = `
            <div class="task-header">
                <div style="flex:1">
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
            <div class="task-category" style="background:${cat.color}">${cat.name}</div>
            <div class="task-actions">
                <button class="task-btn complete-btn" data-task-id="${task.id}"></button>
            </div>
        `;

        el.querySelector('.more-btn').addEventListener('click', e => {
            e.stopPropagation();
            this.selectedTaskId = task.id;
            this.openActionModal(e);
        });

        el.querySelector('.complete-btn').addEventListener('click', e => {
            e.stopPropagation();
            this.toggleTaskComplete(task.id);
        });

        el.addEventListener('click', e => {
            if (!e.target.closest('.task-btn')) {
                this.selectedTaskId = task.id;
                this.openTaskModal(true);
            }
        });

        return el;
    }

    toggleTaskComplete(taskId) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            this.tasks[idx].completed = !this.tasks[idx].completed;
            this.saveToStorage();
            const el = document.querySelector(`[data-task-id="${taskId}"]`);
            if (el) {
                const title = el.querySelector('.task-title-text');
                if (this.tasks[idx].completed) {
                    el.classList.add('completed');
                    title.style.textDecoration = 'line-through';
                    title.style.opacity = '0.7';
                } else {
                    el.classList.remove('completed');
                    title.style.textDecoration = 'none';
                    title.style.opacity = '1';
                }
            }
        }
    }

    openTaskModal(edit = false) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');
        const saveBtn = document.getElementById('saveTaskBtn');
        this.clearTimeWarnings();

        if (edit && this.selectedTaskId) {
            const task = this.tasks.find(t => t.id === this.selectedTaskId);
            if (task) {
                this.editingTaskId = task.id;
                title.textContent = 'Редактировать задачу';
                saveBtn.textContent = 'Сохранить';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDate').value = task.date;
                document.getElementById('taskTime').value = task.time;
                document.getElementById('taskCategory').value = task.category;
                document.getElementById('taskDescription').value = task.description || '';
            }
        } else {
            this.editingTaskId = null;
            title.textContent = 'Новая задача';
            saveBtn.textContent = 'Создать';
            document.getElementById('taskForm').reset();
            document.getElementById('taskDate').value = this.currentDate.toISOString().split('T')[0];
        }
        modal.classList.add('show');
    }

    saveTask() {
        const form = document.getElementById('taskForm');
        if (!form.checkValidity()) return form.reportValidity();

        const task = {
            id: this.editingTaskId || Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            date: document.getElementById('taskDate').value,
            time: document.getElementById('taskTime').value,
            category: document.getElementById('taskCategory').value,
            description: document.getElementById('taskDescription').value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        const conflict = this.checkTimeConflictForTask(task, this.editingTaskId);
        if (conflict && !confirm(`Конфликт с "${conflict.title}" (${conflict.time}). Сохранить?`)) return;

        if (this.editingTaskId) {
            const idx = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (idx !== -1) this.tasks[idx] = { ...this.tasks[idx], ...task };
        } else {
            this.tasks.push(task);
        }

        this.saveToStorage();
        this.closeAllModals();
        this.renderTasks(this.currentFilter);
    }

    deleteTask() {
        if (confirm('Удалить задачу?')) {
            this.tasks = this.tasks.filter(t => t.id !== this.selectedTaskId);
            this.saveToStorage();
            this.renderTasks(this.currentFilter);
            this.closeActionModal();
        }
    }

    editTask() {
        this.closeActionModal();
        this.openTaskModal(true);
    }

    moveTask() {
        const task = this.tasks.find(t => t.id === this.selectedTaskId);
        if (!task) return;
        const newDate = prompt('Новая дата (ГГГГ-ММ-ДД):', task.date);
        const newTime = prompt('Новое время (ЧЧ:ММ):', task.time);
        if (!newDate || !newTime || !/^\d{2}:\d{2}$/.test(newTime)) return;
        const temp = { ...task, date: newDate, time: newTime };
        if (this.checkTimeConflictForTask(temp, task.id)) return alert('Конфликт времени!');
        task.date = newDate;
        task.time = newTime;
        this.saveToStorage();
        this.renderTasks(this.currentFilter);
        this.closeActionModal();
    }

    createCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;
        if (!name || this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert('Категория уже существует');
            return;
        }
        this.categories.push({ id: 'custom_' + Date.now(), name, color });
        this.saveToStorage();
        this.renderCategories();
        this.closeAllModals();
    }

    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        this.closeActionModal();
        this.editingTaskId = null;
        this.selectedTaskId = null;
        this.clearTimeWarnings();
    }

    closeActionModal() {
        document.getElementById('actionModal').classList.remove('show');
    }

    clearTimeWarnings() {
        document.querySelectorAll('.warning').forEach(w => w.remove());
    }

    checkTimeConflictForTask(task, editingId) {
        return this.tasks.find(t => {
            if (editingId && t.id === editingId) return false;
            return t.date === task.date && t.time === task.time;
        });
    }

    openCategoryModal() {
        document.getElementById('categoryModal').classList.add('show');
    }

    openActionModal(e) {
        const modal = document.getElementById('actionModal');
        const rect = e.target.getBoundingClientRect();
        modal.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        modal.classList.add('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});




