import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, AuthenticatedRequest } from '../types/express.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Branch from '../models/Branch.js';
import { generateCompanyId } from '../utils/helpers.js';

const DEFAULT_BRANCHES = [
  { name: 'Kigali', location: 'Kigali City', description: 'Main showroom and head office' },
  { name: 'Musanze', location: 'Musanze District', description: 'Northern region branch' },
  { name: 'Muhanga', location: 'Muhanga District', description: 'Southern region branch' },
];

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

const seedDefaultBranches = async (companyId: string, createdBy: string): Promise<void> => {
  await Promise.all(
    DEFAULT_BRANCHES.map((b) =>
      Branch.create({ companyId, ...b, isActive: true, createdBy })
    )
  );
};

// POST /api/auth/register - Create user profile after Firebase signup
router.post(
  '/register',
  optionalAuth,
  [
    body('uid').notEmpty().withMessage('uid is required'),
    body('name').optional().isString(),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('companyName').optional().isString(),
    body('companyId').optional().isString(),
  ],
  validate,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
      const authUid = req.user?.uid;
      const {
        uid,
        name,
        email,
        companyName,
        companyId,
        role = 'admin',
      } = req.body;

      const effectiveUid = uid || authUid;
      if (!effectiveUid) {
        res.status(401).json({ success: false, message: 'Unauthorized: no uid provided' });
        return;
      }

      const existing = await User.findOne({ uid: effectiveUid });
      if (existing) {
        res.status(200).json({ success: true, user: existing });
        return;
      }

      let effectiveCompanyId = companyId;
      let effectiveCompanyName = companyName;

      if (!effectiveCompanyId && role === 'admin') {
        effectiveCompanyId = generateCompanyId();
        effectiveCompanyName = effectiveCompanyName || name || 'My Company';

        const company = await Company.create({
          companyId: effectiveCompanyId,
          companyName: effectiveCompanyName,
          ownerUid: effectiveUid,
        });

        await seedDefaultBranches(effectiveCompanyId, effectiveUid);

        res.status(201).json({
          success: true,
          user: null,
          company,
          requiresProfile: true,
        });
        return;
      }

      if (role === 'admin' && effectiveCompanyId) {
        const companyExists = await Company.exists({ companyId: effectiveCompanyId });
        if (!companyExists) {
          await Company.create({
            companyId: effectiveCompanyId,
            companyName: effectiveCompanyName || name || 'My Company',
            ownerUid: effectiveUid,
          });
          await seedDefaultBranches(effectiveCompanyId, effectiveUid);
        }
      }

      const user = await User.create({
        uid: effectiveUid,
        name,
        email,
        companyName: effectiveCompanyName,
        role,
        companyId: effectiveCompanyId,
        isActive: true,
      });

      res.status(201).json({ success: true, user });
    }
  )
);

// GET /api/auth/profile - Get current user profile
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.user?.uid;
    const user = await User.findOne({ uid });
    if (!user) {
      res.status(404).json({ success: false, message: 'User profile not found' });
      return;
    }
    res.json({ success: true, user });
  })
);

// PUT /api/auth/profile - Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().isString(),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('companyName').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.user?.uid;
    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.companyName !== undefined)
      updates.companyName = req.body.companyName;

    const user = await User.findOneAndUpdate({ uid }, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User profile not found' });
      return;
    }
    res.json({ success: true, user });
  })
);

export default router;
