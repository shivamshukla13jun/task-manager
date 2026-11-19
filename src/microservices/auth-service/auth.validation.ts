import { z } from 'zod';

// User Registration Schema
export const authRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email format').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
  confirmPassword: z.string(),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional(),
  role: z.enum(['user', 'admin', 'superadmin']).default('user')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword']
});

// User Login Schema
export const authLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
});






