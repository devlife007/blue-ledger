import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, AuthenticatedRequest } from '../types/express.js';
import Branch from '../models/Branch.js';
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

// GET /api/branches - List branches for company
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const branches = await Branch.find({ companyId }).sort({ createdAt: -1 });
    res.json({ success: true, branches });
  })
);

// POST /api/branches - Create branch
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Branch name is required'),
    body('companyId').notEmpty().withMessage('companyId is required'),
    body('location').optional().isString(),
    body('description').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { companyId, name, location, description } = req.body;

    const branch = await Branch.create({
      companyId,
      name,
      location,
      description,
      isActive: true,
      createdBy: req.user?.uid,
    });

    res.status(201).json({ success: true, branch });
  })
);

// PUT /api/branches/:id - Update branch
router.put(
  '/:id',
  [
    param('id').notEmpty().withMessage('Branch id is required'),
    body('name').optional().isString(),
    body('location').optional().isString(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.location !== undefined) updates.location = req.body.location;
    if (req.body.description !== undefined)
      updates.description = req.body.description;
    if (req.body.isActive !== undefined)
      updates.isActive = req.body.isActive === true || req.body.isActive === 'true';

    const branch = await Branch.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      res.status(404).json({ success: false, message: 'Branch not found' });
      return;
    }
    res.json({ success: true, branch });
  })
);

// DELETE /api/branches/:id - Delete branch
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      res.status(404).json({ success: false, message: 'Branch not found' });
      return;
    }
    // Unassign workers from this branch
    await User.updateMany(
      { branchId: req.params.id },
      { $unset: { branchId: '' } }
    );
    res.json({ success: true, message: 'Branch deleted' });
  })
);

// GET /api/branches/:id/workers - List workers in a branch
router.get(
  '/:id/workers',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workers = await User.find({ branchId: req.params.id, role: 'worker' });
    res.json({ success: true, workers });
  })
);

export default router;
