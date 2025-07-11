import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { userValidationSchema } from "@/validation/user.validation";

const authRouter = new Hono();

authRouter.post(
  "/register",
  zValidator("form", userValidationSchema, (result, c) => {
    if (!result.success) {
      console.log("Validation success:", result.success);

      let errorMessage: {
        [key: string]: string;
      }[] = [];
      if (Array.isArray(result.error.issues)) {
        console.log("Validation issues:", result.error.issues);
        errorMessage = result.error.issues.map(issue => ({
          [issue.path.join(".")]: issue.message,
        }));
      }
      console.log("Validation name:", result.error.name);

      return c.json(errorMessage, 500);
    }
  }),
  c => {
    const userData = c.req.valid("form");

    console.log("User registration data:", userData);

    return c.json({ message: "User registered successfully!" }, 201);
  }
);

export { authRouter };
