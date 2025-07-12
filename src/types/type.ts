import type { Document, Types } from "mongoose";

export type ObjectId = Types.ObjectId;

export type WithDoc<T> = T & Document;
