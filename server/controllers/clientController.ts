import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { AppError } from '../middleware/errors';

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const limit = parseInt(req.query.limit as string) || 25;
    const cursor = parseInt(req.query.cursor as string) || 0; // Simplified pagination

    const result = await db.withTenant(orgId, async (client) => {
      return client.query(
        `SELECT id, first_name, last_name, preferred_name, email, phone, status, created_at
         FROM clients
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, cursor]
      );
    });

    res.json({
      data: result.rows,
      pagination: {
        nextCursor: result.rows.length === limit ? cursor + limit : null,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = req.params;

    const result = await db.withTenant(orgId, async (client) => {
      return client.query(
        `SELECT * FROM clients WHERE id = $1`,
        [id]
      );
    });

    if (result.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Client not found');
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.tenant!.organizationId;
    const { firstName, lastName, email, phone, dateOfBirth } = req.body;

    if (!firstName || !lastName) {
      throw new AppError(400, 'BAD_REQUEST', 'First and last name are required');
    }

    const result = await db.withTenant(orgId, async (client) => {
      return client.query(
        `INSERT INTO clients (organization_id, first_name, last_name, email, phone, date_of_birth)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orgId, firstName, lastName, email, phone, dateOfBirth]
      );
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
