import { Types } from "mongoose";
import { z } from "zod/v4";

import { fileError, requiredError } from "@/utils/error";

const videoValidationSchema = z.object({
  title: requiredError("Title")
    .min(1, { message: "Title cannot be empty" })
    .max(255, { message: "Title must be no more than 255 characters long" }),

  description: requiredError("Description")
    .min(1, { message: "Description cannot be empty" })
    .max(5000, {
      message: "Description must be no more than 5000 characters long",
    }),

  owner: requiredError("Owner ID")
    .refine(val => Types.ObjectId.isValid(val), {
      message: "Invalid Owner ID format",
    })
    .transform(val => new Types.ObjectId(val)),

  videoFile: fileError("Video file")
    .max(100 * 1024 * 1024, { message: "Video file must be less than 100MB" })
    .mime(
      [
        "video/mp4",
        "video/x-m4v",
        "video/x-msvideo",
        "video/x-ms-wmv",
        "video/quicktime",
        "video/x-flv",
        "video/x-matroska",
      ],
      { message: "Invalid video file type" }
    ),

  thumbnail: fileError("Thumbnail")
    .max(5 * 1024 * 1024, { message: "Thumbnail file must be less than 5MB" })
    .mime(["image/jpeg", "image/png", "image/gif"], {
      message: "Invalid thumbnail file type",
    }),
});

export type videoValidationInput = z.infer<typeof videoValidationSchema>;

export default videoValidationSchema;
