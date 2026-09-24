import { z } from "zod";

export type FormState = { error?: string; message?: string } | undefined;

/** Parses the named form fields against a zod shape; missing fields arrive as null and fail validation. */
export function parseForm<S extends z.ZodRawShape>(shape: S, formData: FormData) {
  const raw = Object.fromEntries(Object.keys(shape).map((key) => [key, formData.get(key)]));
  return z.object(shape).safeParse(raw);
}

export const firstIssue = (error: z.ZodError) => error.issues[0].message;
