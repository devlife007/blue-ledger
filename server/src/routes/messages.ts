import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, AuthenticatedRequest } from '../types/express.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

router.use(authenticate);

// GET /api/messages - List messages (admin sees all for company, worker sees own)
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const user = await User.findOne({ uid: req.user?.uid });
    const isAdmin = user?.role === 'admin';

    const filter: any = { companyId };
    if (!isAdmin) {
      filter.fromUid = req.user?.uid;
    }

    const branchId = req.query.branchId as string;
    if (branchId) filter.branchId = branchId;

    const messages = await Message.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, messages });
  })
);

// POST /api/messages - Send message
router.post(
  '/',
  [
    body('text').notEmpty().withMessage('Message text is required'),
    body('companyId').notEmpty().withMessage('companyId is required'),
    body('branchId').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { text, companyId, branchId } = req.body;
    const user = await User.findOne({ uid: req.user?.uid });

    const message = await Message.create({
      companyId,
      fromUid: req.user?.uid,
      fromName: user?.name || req.user?.name || 'User',
      fromEmail: user?.email || req.user?.email,
      text,
      likedByAdmin: false,
      branchId: branchId || user?.branchId || undefined,
    });

    res.status(201).json({ success: true, message });
  })
);

// DELETE /api/messages/:id - Delete message
router.delete(
  '/:id',
  [param('id').notEmpty().withMessage('Message id is required')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const message = await Message.findById(req.params.id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    const user = await User.findOne({ uid: req.user?.uid });
    const isAdmin = user?.role === 'admin';
    const isOwner = message.fromUid === req.user?.uid;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message deleted' });
  })
);

// PUT /api/messages/:id/like - Toggle like (admin only)
router.put(
  '/:id/like',
  [param('id').notEmpty().withMessage('Message id is required')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const message = await Message.findById(req.params.id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    const user = await User.findOne({ uid: req.user?.uid });
    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Only admins can like messages' });
      return;
    }

    if (message.likedByAdmin) {
      // Unlike
      message.likedByAdmin = false;
      message.likedAt = undefined;
      message.likedByUid = undefined;
      message.likedByName = undefined;
    } else {
      // Like
      message.likedByAdmin = true;
      message.likedAt = new Date();
      message.likedByUid = req.user?.uid;
      message.likedByName = user?.name || req.user?.name || '';
    }

    await message.save();
    res.json({ success: true, message });
  })
);

export default router;
