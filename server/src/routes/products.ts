import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, AuthenticatedRequest } from '../types/express.js';
import Product from '../models/Product.js';
import { paginate, isPositiveInteger } from '../utils/helpers.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

router.use(authenticate);

const getUserCompanyId = (req: AuthenticatedRequest): string => {
  // In a real app the companyId would come from the user's MongoDB profile tied to uid
  return (req.body.companyId as string) || (req.query.companyId as string) || '';
};

// Upload images to Cloudinary (proxy endpoint)
router.post(
  '/upload/images',
  upload.array('images', 10),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      res.status(400).json({ success: false, message: 'No images provided' });
      return;
    }

    const folder = `warenova/${req.user?.uid}/uploads`;
    const uploaded: { url: string; publicId: string }[] = [];

    for (const file of files) {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    res.status(201).json({ success: true, images: uploaded });
  })
);

// GET /api/products - List products with pagination, search, filters
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('status').optional().isIn(['available', 'sold']),
    query('branchId').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'companyId is required' });
      return;
    }

    const { skip, limit, page } = paginate(
      req.query.page,
      (req.query.limit as string) || '20'
    );
    const filter: any = { companyId };

    if (req.query.search) {
      filter.name = { $regex: req.query.search as string, $options: 'i' };
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.branchId) filter.branchId = req.query.branchId;

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// POST /api/products - Create product with image uploads
router.post(
  '/',
  upload.array('images', 10),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('companyId').notEmpty().withMessage('companyId is required'),
    body('price').isFloat({ min: 0 }).withMessage('Invalid price'),
    body('category').optional().isString(),
    body('qtyUploaded').optional().isInt({ min: 0 }),
    body('branchId').optional().isString(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      category,
      price,
      qtyUploaded = 0,
      branchId,
    } = req.body;
    const companyId = req.body.companyId;
    const files = (req.files as Express.Multer.File[]) || [];

    let imageUrls: string[] = [];
    let imagePublicIds: string[] = [];

    const existingUrls = req.body.existingImageUrls;
    const existingPublicIds = req.body.existingImagePublicIds;
    if (existingUrls) {
      try {
        imageUrls = JSON.parse(existingUrls);
        imagePublicIds = existingPublicIds
          ? JSON.parse(existingPublicIds)
          : [];
      } catch {
        // ignore malformed
      }
    }

    const folder = `warenova/${companyId}/products`;
    for (const file of files) {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      imageUrls.push(result.secure_url);
      imagePublicIds.push(result.public_id);
    }

    const qty = Number(qtyUploaded) || 0;

    const product = await Product.create({
      companyId,
      name,
      category: category || '',
      price: Number(price),
      qtyUploaded: qty,
      qtySold: 0,
      qtyCurrent: qty,
      status: qty > 0 ? 'available' : 'sold',
      imageUrls,
      imagePublicIds,
      createdBy: req.user?.uid,
      branchId: branchId || undefined,
    });

    res.status(201).json({ success: true, product });
  })
);

// PUT /api/products/:id - Update product
router.put(
  '/:id',
  upload.array('images', 10),
  [
    param('id').notEmpty().withMessage('Product id is required'),
    body('name').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().isString(),
    body('status').optional().isIn(['available', 'sold']),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.price !== undefined) updates.price = Number(req.body.price);
    if (req.body.status !== undefined) updates.status = req.body.status;

    const files = (req.files as Express.Multer.File[]) || [];
    const oldPublicIds = product.imagePublicIds || [];

    for (const file of files) {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `warenova/${product.companyId}/products`, resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      updates.imageUrls = [...(updates.imageUrls || product.imageUrls || []), result.secure_url];
      updates.imagePublicIds = [...(updates.imagePublicIds || oldPublicIds), result.public_id];
    }

    // Delete images removed by client if provided
    if (req.body.removeImagePublicIds) {
      let toRemove: string[] = [];
      try {
        toRemove = JSON.parse(req.body.removeImagePublicIds);
      } catch {
        toRemove = [req.body.removeImagePublicIds];
      }
      for (const publicId of toRemove) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch {
          // continue
        }
        updates.imageUrls = (updates.imageUrls || product.imageUrls).filter(
          (u: string, i: number) => (updates.imagePublicIds || oldPublicIds)[i] !== publicId
        );
      }
      updates.imagePublicIds = (updates.imagePublicIds || oldPublicIds).filter(
        (p: string) => !toRemove.includes(p)
      );
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, product: updated });
  })
);

// DELETE /api/products/:id - Delete product + Cloudinary images
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    for (const publicId of product.imagePublicIds || []) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch {
        // continue deleting product even if cloudinary fails
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  })
);

// POST /api/products/:id/restock - Restock product
router.post(
  '/:id/restock',
  [body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const qty = Number(req.body.qty);

    const session = await Product.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const product = await Product.findById(req.params.id).session(session);
        if (!product) {
          throw Object.assign(new Error('Product not found'), { statusCode: 404 });
        }
        product.qtyUploaded += qty;
        product.qtyCurrent += qty;
        product.status = 'available';
        result = await product.save({ session });
      });
    } finally {
      session.endSession();
    }

    res.json({ success: true, product: result });
  })
);

// POST /api/products/:id/sell - Sell units (decrement stock)
router.post(
  '/:id/sell',
  [body('qty').custom(isPositiveInteger).withMessage('Quantity must be a positive integer')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const qty = Number(req.body.qty);

    const session = await Product.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const product = await Product.findById(req.params.id).session(session);
        if (!product) {
          throw Object.assign(new Error('Product not found'), { statusCode: 404 });
        }
        if (product.qtyCurrent < qty) {
          throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
        }
        product.qtyCurrent -= qty;
        product.qtySold += qty;
        if (product.qtyCurrent === 0) product.status = 'sold';
        product.lastSoldAt = new Date();
        product.lastSoldByUid = req.user?.uid;
        product.lastSoldByName = req.body.soldByName || '';
        result = await product.save({ session });
      });
    } finally {
      session.endSession();
    }

    res.json({ success: true, product: result });
  })
);

export default router;
