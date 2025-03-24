/**
 * Storage module for the To-Do List application
 * Handles saving and retrieving tasks from the backend API
 */

const Storage = (function() {
    // Base API URL - change this to match your server
    const API_URL = 'http://localhost:3000/api/todos';
    
    // Keep the recycled tasks in localStorage for now
    const RECYCLED_TASKS_KEY = 'recycledTasks';

    /**
     * Get tasks from the API
     * @returns {Promise<Array>} Promise resolving to array of task objects
     */
    async function getTasks() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting tasks:', error);
            return [];
        }
    }

    /**
     * Add a new task
     * @param {Object} task - Task object
     * @returns {Promise<Array>} Promise resolving to updated array of tasks
     */
    async function addTask(task) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(task),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add task');
            }
            
            return await getTasks();
        } catch (error) {
            console.error('Error adding task:', error);
            return await getTasks();
        }
    }

    /**
     * Update an existing task
     * @param {String} taskId - ID of the task to update
     * @param {Object} updatedTask - Updated task object
     * @returns {Promise<Array>} Promise resolving to updated array of tasks
     */
    async function updateTask(taskId, updatedTask) {
        try {
            const response = await fetch(`${API_URL}/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedTask),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update task');
            }
            
            return await getTasks();
        } catch (error) {
            console.error('Error updating task:', error);
            return await getTasks();
        }
    }

    /**
     * Delete a task (move to recycle bin)
     * @param {String} taskId - ID of the task to delete
     * @returns {Promise<Array>} Promise resolving to updated array of tasks
     */
    async function deleteTask(taskId) {
        try {
            const allTasks = await getTasks();
            const taskToRecycle = allTasks.find(task => task.id === taskId);
            
            if (taskToRecycle) {
                taskToRecycle.deletedAt = new Date().toISOString();
                const recycledTasks = getRecycledTasks();
                recycledTasks.push(taskToRecycle);
                localStorage.setItem(RECYCLED_TASKS_KEY, JSON.stringify(recycledTasks));

                const response = await fetch(`${API_URL}/${taskId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete task');
                }

                // Ensure the deletion operation completes
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return await getTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            return await getTasks();
        }
    }

    /**
     * Toggle the completed status of a task
     * @param {String} taskId - ID of the task to toggle
     * @returns {Promise<Array>} Promise resolving to updated array of tasks
     */
    async function toggleTaskStatus(taskId) {
        try {
            const allTasks = await getTasks();
            const task = allTasks.find(task => task.id === taskId);
            
            if (task) {
                const updatedTask = {
                    ...task,
                    completed: !task.completed
                };
                
                await updateTask(taskId, updatedTask);
                return await getTasks();
            }
            
            return allTasks;
        } catch (error) {
            console.error('Error toggling task status:', error);
            return await getTasks();
        }
    }

    /**
     * Get tasks due on a specific date
     * @param {String} date - Date string in format 'YYYY-MM-DD'
     * @returns {Promise<Array>} Promise resolving to array of tasks due on the specified date
     */
    async function getTasksByDate(date) {
        try {
            const tasks = await getTasks();
            return tasks.filter(task => task.dueDate === date);
        } catch (error) {
            console.error('Error getting tasks by date:', error);
            return [];
        }
    }

    /**
     * Get all dates that have tasks
     * @returns {Promise<Array>} Promise resolving to array of date strings that have associated tasks
     */
    async function getDatesWithTasks() {
        try {
            const tasks = await getTasks();
            const dates = new Set();
            
            tasks.forEach(task => {
                if (task.dueDate) {
                    dates.add(task.dueDate);
                }
            });
            
            return Array.from(dates);
        } catch (error) {
            console.error('Error getting dates with tasks:', error);
            return [];
        }
    }

    // Function to get recycled tasks from localStorage
    function getRecycledTasks() {
        const recycledTasksJSON = localStorage.getItem(RECYCLED_TASKS_KEY);
        return recycledTasksJSON ? JSON.parse(recycledTasksJSON) : [];
    }

    // Function to permanently delete task from recycle bin
    function permanentlyDeleteTask(taskId) {
        const recycledTasks = getRecycledTasks();
        const filteredTasks = recycledTasks.filter(task => task.id !== taskId);
        localStorage.setItem(RECYCLED_TASKS_KEY, JSON.stringify(filteredTasks));
        return filteredTasks;
    }

    // Function to empty the entire recycle bin
    function emptyRecycleBin() {
        localStorage.setItem(RECYCLED_TASKS_KEY, JSON.stringify([]));
        return [];
    }

    // Function to restore task from recycle bin
    async function restoreTask(taskId) {
        const recycledTasks = getRecycledTasks();
        const taskIndex = recycledTasks.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
            const taskToRestore = {...recycledTasks[taskIndex]};
            delete taskToRestore.deletedAt;
            
            await addTask(taskToRestore);
            
            recycledTasks.splice(taskIndex, 1);
            localStorage.setItem(RECYCLED_TASKS_KEY, JSON.stringify(recycledTasks));
        }
        
        return recycledTasks;
    }

    // Function to clean up old recycled tasks (older than 30 days)
    function cleanupRecycleBin() {
        const recycledTasks = getRecycledTasks();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filteredTasks = recycledTasks.filter(task => {
            const deletedDate = new Date(task.deletedAt);
            return deletedDate > thirtyDaysAgo;
        });
        
        localStorage.setItem(RECYCLED_TASKS_KEY, JSON.stringify(filteredTasks));
        return filteredTasks;
    }

    // Public API
    return {
        getTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        getTasksByDate,
        getDatesWithTasks,
        getRecycledTasks,
        permanentlyDeleteTask,
        restoreTask,
        cleanupRecycleBin,
        emptyRecycleBin  
    };
})();
