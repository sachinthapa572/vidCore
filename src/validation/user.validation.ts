import * as z from "zod/v4";

const ValidFileTypes = {
  PNG: "image/png",
  JPG: "image/jpeg",
  GIF: "image/gif",
} as const;

export const userValidationSchema = z.object({
  fullName: z
    .string({ error: "Invalid full name" })
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name must be at most 50 characters"),
  email: z.email("Invalid email address"),
  username: z
    .string({ error: "Invalid username" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^\w+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string({ error: "Invalid password" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
  avatar: z
    .file({ error: "Invalid avatar file" })
    .max(5 * 1024 * 1024, "Avatar file must be less than 5MB")
    .mime(Object.values(ValidFileTypes))
    .optional(),
  coverImage: z
    .file({ error: "Invalid cover image file" })
    .max(10 * 1024 * 1024, "Cover image file must be less than 10MB")
    .mime(Object.values(ValidFileTypes))
    .optional(),
});

export const updateImageschema = userValidationSchema
  .pick({
    coverImage: true,
    avatar: true,
  })
  .check(ctx => {
    if (ctx.value.avatar || ctx.value.coverImage) {
      ctx.issues.push({
        code: "too_big",
        maximum: 3,
        origin: "image",
        inclusive: true,
        message: "at least one field is required",
        input: ctx.value,
      });
    }
  });

export const userLoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updatePasswordSchema = z
  .object({
    oldPassword: z.string().min(6, "Old password must be at least 6 characters"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  })
  .check(ctx => {
    if (ctx.value.oldPassword === ctx.value.newPassword) {
      ctx.issues.push({
        code: "too_big",
        maximum: 3,
        origin: "oldPassword",
        inclusive: true,
        message: "Passwords must be different",
        input: ctx.value,
      });
    }
  });

export type UserValidationInput = z.infer<typeof userValidationSchema>;
export type UpdateImageInput = z.infer<typeof updateImageschema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
