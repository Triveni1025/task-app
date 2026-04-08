import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, getStats } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // protect all task routes

router.route('/').get(getTasks).post(createTask);
router.route('/stats').get(getStats);
router.route('/:id').put(updateTask).delete(deleteTask);

export default router;
