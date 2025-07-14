import { z } from "zod/v4";

export const requiredError = (field: string) =>
  z.string({
    error: issue => {
      if (issue.code === "invalid_type") {
        return `${field} must be a string`;
      }
      if (issue.input === undefined) {
        return `${field} is required`;
      }
      return `Invalid ${field}`;
    },
  });

export const fileError = (field: string) =>
  z.file({
    error: issue => {
      if (issue.code === "invalid_type") {
        return `${field} must be a file`;
      }
      if (issue.input === undefined) {
        return `${field} is required`;
      }
      return `Invalid ${field}`;
    },
  });
