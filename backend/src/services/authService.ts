import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import pool from '../config/database';
import { config } from '../config/env';

const googleClient = new OAuth2Client(config.auth.googleClientId);

export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPayload {
  userId: number;
  email: string;
}

export const verifyGoogleToken = async (token: string) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.auth.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid Google token');

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      pictureUrl: payload.picture,
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    throw new Error('Invalid Google token');
  }
};

export const findOrCreateUser = async (
  googleId: string,
  email: string,
  name: string,
  pictureUrl?: string
): Promise<User> => {
  try {
    // Try to find existing user
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [
      googleId,
    ]);

    if (result.rows.length > 0) {
      return mapRowToUser(result.rows[0]);
    }

    // Create new user
    const insertResult = await pool.query(
      'INSERT INTO users (google_id, email, name, picture_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [googleId, email, name, pictureUrl]
    );

    return mapRowToUser(insertResult.rows[0]);
  } catch (error) {
    console.error('Error finding or creating user:', error);
    throw error;
  }
};

export const generateJWT = (userId: number, email: string): string => {
  return jwt.sign(
    { userId, email } as TokenPayload,
    config.auth.jwtSecret,
    { expiresIn: '7d' }
  );
};

export const verifyJWT = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
};

export const getUserById = async (userId: number): Promise<User> => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return mapRowToUser(result.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

const mapRowToUser = (row: any): User => ({
  id: row.id,
  googleId: row.google_id,
  email: row.email,
  name: row.name,
  pictureUrl: row.picture_url,
  isAdmin: row.is_admin,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});
