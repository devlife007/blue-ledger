import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, AuthenticatedRequest } from '../types/express.js';
import admin from '../config/firebase.js';
import User from '../models/User.js';
import { randomPassword } from '../utils/helpers.js';

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

// GET /api/workers - List workers for company
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const workers = await User.find({ companyId, role: 'worker' }).sort({
      createdAt: -1,
    });
    res.json({ success: true, workers });
  })
);

// POST /api/workers - Create worker (Firebase Auth user + MongoDB profile)
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }),
    body('companyId').notEmpty().withMessage('companyId is required'),
    body('branchId').optional().isString(),
  ],
  validate,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
      const { name, email, password, companyId, branchId } = req.body;
      const generatedPassword = password || randomPassword();

      let firebaseUser;
      try {
        firebaseUser = await admin.auth().createUser({
          email,
          password: generatedPassword,
          displayName: name,
          emailVerified: false,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          message: 'Failed to create Firebase user',
          detail: error.message,
        });
        return;
      }

      try {
        const user = await User.create({
          uid: firebaseUser.uid,
          name,
          email,
          companyId,
          role: 'worker',
          branchId: branchId || undefined,
          createdBy: req.user?.uid,
          isActive: true,
        });
        res.status(201).json({ success: true, user });
      } catch (error) {
        // Rollback Firebase user if Mongo create fails
        try {
          await admin.auth().deleteUser(firebaseUser.uid);
        } catch {
          // ignore
        }
        throw error;
      }
    }
  )
);

// DELETE /api/workers/:uid - Delete worker
router.delete(
  '/:uid',
  [param('uid').notEmpty().withMessage('uid is required')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.params.uid as string;

    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Failed to delete Firebase user',
        detail: error.message,
      });
      return;
    }

    await User.findOneAndDelete({ uid });
    res.json({ success: true, message: 'Worker deleted' });
  })
);

// PUT /api/workers/:uid/assign-branch - Assign worker to a branch
router.put(
  '/:uid/assign-branch',
  [body('branchId').optional().isString()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.params.uid;
    const { branchId } = req.body;

    const user = await User.findOneAndUpdate(
      { uid },
      { branchId: branchId || undefined },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'Worker not found' });
      return;
    }
    res.json({ success: true, user });
  })
);

export default router;
