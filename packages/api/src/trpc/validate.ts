/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { z } from "zod/v4";
import { ValidationError } from "@proyecta/common";

/**
 * tRPC input parser for a shared Zod schema. It is "Zod-esque" (`_input`/`_output` for client
 * types, `parse` at runtime), but invalid input throws the same ValidationError (Spanish field
 * errors) the validated functions use, instead of a raw ZodError.
 */
export function validate<S extends z.ZodType>(schema: S) {
  return {
    _input: undefined as unknown as z.input<S>,
    _output: undefined as unknown as z.output<S>,
    parse(raw: unknown): z.output<S> {
      const result = schema.safeParse(raw);
      if (!result.success) throw new ValidationError(result.error);
      return result.data;
    }
  };
}
