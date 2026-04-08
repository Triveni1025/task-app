import Task from '../models/Task.js';

export const getTasks = async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    
    let query = { user: req.user.id };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Please add a text title' });
    }

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status,
      user: req.user.id
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check for user
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await task.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const total = await Task.countDocuments({ user: req.user.id });
    const completed = await Task.countDocuments({ user: req.user.id, status: 'completed' });
    const pending = total - completed;

    res.status(200).json({ total, completed, pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
