import { useState, useEffect, useContext } from 'react';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { Plus, Sun, Moon, LogOut, Search, Edit2, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'pending' });

  const fetchTasks = async () => {
    try {
      const { data } = await API.get(`/tasks?search=${search}`);
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/tasks/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [search]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Optimistic update
    const newStatus = destination.droppableId;
    const updatedTasks = tasks.map(t => t._id === draggableId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    
    // Update API
    try {
      await API.put(`/tasks/${draggableId}`, { status: newStatus });
      fetchStats();
    } catch (err) {
      fetchTasks(); // Revert on err
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await API.put(`/tasks/${editingTask._id}`, formData);
      } else {
        await API.post('/tasks', formData);
      }
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'pending' });
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('Delete this task?')) {
      try {
        await API.delete(`/tasks/${id}`);
        fetchTasks();
        fetchStats();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({ 
        title: task.title, 
        description: task.description, 
        priority: task.priority, 
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        status: task.status
      });
    } else {
      setEditingTask(null);
      setFormData({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'pending' });
    }
    setIsModalOpen(true);
  };

  const columns = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'completed': 'Completed'
  };

  return (
    <div className="app-container">
      <nav className="navbar glass">
        <div className="nav-brand">
          TaskFlow
        </div>
        <div className="nav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
            <span style={{ fontWeight: 500 }}>{user?.name}</span>
          </div>
          <button className="btn-icon" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="btn btn-outline" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card stat-card" style={{ flex: 1 }}>
            <span className="value">{stats.total}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Total Tasks</span>
          </div>
          <div className="card stat-card" style={{ flex: 1 }}>
            <span className="value" style={{ color: 'var(--priority-high-text)' }}>{stats.pending}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
          </div>
          <div className="card stat-card" style={{ flex: 1 }}>
            <span className="value" style={{ color: 'var(--priority-low-text)' }}>{stats.completed}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
          </div>
        </div>

        <div className="filters-bar">
          <div className="form-group" style={{ margin: 0, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search tasks..." 
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} /> New Task
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {Object.entries(columns).map(([columnId, columnTitle]) => (
              <div key={columnId} className="kanban-column">
                <div className="column-header">
                  <span className="column-title">{columnTitle}</span>
                  <span className="badge badge-medium">
                    {tasks.filter(t => t.status === columnId).length}
                  </span>
                </div>
                <Droppable droppableId={columnId}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      style={{ minHeight: '100px' }}
                    >
                      {tasks.filter(t => t.status === columnId).map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="task-card"
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                marginBottom: '1rem'
                              }}
                            >
                              <div className="task-header">
                                <span className="task-title">{task.title}</span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button onClick={() => openModal(task)} className="btn-icon" style={{ padding: '0.25rem' }}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(task._id)} className="btn-icon" style={{ padding: '0.25rem', color: 'var(--danger-color)' }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <p className="task-desc">{task.description}</p>
                              <div className="task-footer">
                                <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                                {task.dueDate && <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </main>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="btn-icon modal-close" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input required type="text" className="form-control" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Priority</label>
                  <select className="form-control" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
