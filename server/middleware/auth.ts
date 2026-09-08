import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { AppError } from './errors';

// Extend Express Request to include user and tenant context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      tenant?: {
        organizationId: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, you would verify a JWT token from cookies or auth header here.
    // For now, we simulate finding a user from a session token.
    const token = req.cookies.session || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    
    // Mock user for now since full auth is complex to mock without a real session store.
    // Replace with real logic querying the users table or JWT verification.
    req.user = {
      id: '00000000-0000-0000-0000-000000000000', 
      email: 'user@example.com'
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const orgSlug = req.headers['x-organization-slug'] as string;
    if (!orgSlug) {
      throw new AppError(400, 'BAD_REQUEST', 'Organization context required');
    }

    // Verify user belongs to this organization
    const result = await db.query(
      `SELECT m.organization_id, m.role, o.status 
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND o.slug = $2 AND m.status = 'active'`,
      [req.user.id, orgSlug]
    );

    if (result.rows.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this organization');
    }

    req.tenant = {
      organizationId: result.rows[0].organization_id,
      role: result.rows[0].role
    };

    next();
  } catch (error) {
    next(error);
  }
};
