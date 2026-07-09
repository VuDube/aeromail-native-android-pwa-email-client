/**
 * Core utilities for the AeroMail D1-powered architecture.
 * ALL legacy Durable Object abstractions have been purged.
 */
import type { ApiResponse } from "@shared/types";
import type { Context } from "hono";
export interface Env {
  EMAIL_DB: D1Database;
  TOKENS: KVNamespace;
}
/**
 * Standard Success Response Helper
 */
export const ok = <T>(c: Context, data: T) => {
  return c.json({
    success: true,
    data
  } as ApiResponse<T>);
};
/**
 * Standard Error Response Helper (400 Bad Request)
 */
export const bad = (c: Context, error: string) => {
  return c.json({
    success: false,
    error
  } as ApiResponse, 400);
};
/**
 * Standard Not Found Helper (404)
 */
export const notFound = (c: Context, error = 'Resource not found') => {
  return c.json({
    success: false,
    error
  } as ApiResponse, 404);
};
/**
 * Internal Server Error Helper (500)
 */
export const internalError = (c: Context, error: string) => {
  return c.json({
    success: false,
    error
  } as ApiResponse, 500);
};
/**
 * Type guard for strings
 */
export const isStr = (s: unknown): s is string => typeof s === 'string' && s.length > 0;