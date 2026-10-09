import { ProductUnit, ServiceType } from "@prisma/client";
import { z } from "zod";
import type { AuthContext } from "@/lib/auth";

export const productFields = {
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional().nullable(),
  serviceType: z.enum(ServiceType).optional().nullable(),
  unit: z.enum(ProductUnit),
  unitPrice: z.coerce.number().min(0).max(1_000_000),
  unitCost: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
};

export const skuSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Use letters, numbers, dots, dashes or underscores");

/** Cost and margin are internal: only OWNER and ADMIN may see them. */
export function canSeeCost(ctx: AuthContext) {
  return ctx.user.role === "OWNER" || ctx.user.role === "ADMIN";
}

export function stripCost<T extends { unitCost: number | null }>(p: T, showCost: boolean) {
  if (showCost) return p;
  const { unitCost: _unitCost, ...rest } = p;
  void _unitCost;
  return rest;
}
