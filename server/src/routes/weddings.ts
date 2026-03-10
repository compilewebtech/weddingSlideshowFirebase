import { Router, Request, Response } from 'express';
import { WeddingModel } from '../models/Wedding';
import { requireAuth } from '../middleware/auth';
import type { Wedding } from '../types';

type AuthRequest = Request & { uid: string };

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const weddings = await WeddingModel.findAll();
    return res.json(weddings);
  } catch (error) {
    console.error('Error fetching weddings:', error);
    return res.status(500).json({ error: 'Failed to fetch weddings' });
  }
});

router.get('/admin/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as unknown as AuthRequest).uid;
    const weddings = await WeddingModel.findByUser(uid);
    return res.json(weddings);
  } catch (error) {
    console.error('Error fetching user weddings:', error);
    return res.status(500).json({ error: 'Failed to fetch weddings' });
  }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const wedding = await WeddingModel.findById(req.params.id);
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    return res.json(wedding);
  } catch (error) {
    console.error('Error fetching wedding:', error);
    return res.status(500).json({ error: 'Failed to fetch wedding' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as unknown as AuthRequest).uid;
    const data = req.body as Omit<Wedding, 'id' | 'createdBy' | 'createdAt'>;
    const wedding = await WeddingModel.create(uid, data);
    return res.status(201).json(wedding);
  } catch (error) {
    console.error('Error creating wedding:', error);
    return res.status(500).json({ error: 'Failed to create wedding' });
  }
});

router.patch('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const uid = (req as unknown as AuthRequest).uid;
    const wedding = await WeddingModel.update(req.params.id, uid, req.body);
    if (!wedding) return res.status(404).json({ error: 'Wedding not found or access denied' });
    return res.json(wedding);
  } catch (error) {
    console.error('Error updating wedding:', error);
    return res.status(500).json({ error: 'Failed to update wedding' });
  }
});

router.delete('/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const uid = (req as unknown as AuthRequest).uid;
    const deleted = await WeddingModel.delete(req.params.id, uid);
    if (!deleted) return res.status(404).json({ error: 'Wedding not found or access denied' });
    return res.json({ message: 'Wedding deleted' });
  } catch (error) {
    console.error('Error deleting wedding:', error);
    return res.status(500).json({ error: 'Failed to delete wedding' });
  }
});

export default router;
