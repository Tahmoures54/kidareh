import { z } from "zod";

export const tripRequestSchema = z.object({
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  listingIds: z.array(z.string().trim().min(1).max(100)).max(8),
}).superRefine((value, context) => {
  if ((value.lat === undefined) !== (value.lng === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message: "برای تعیین موقعیت، lat و lng باید هم‌زمان ارسال شوند.",
    });
  }
});

export const tripStatusSchema = z.object({
  status: z.enum(["started", "completed", "cancelled"]),
});

export type TripRequest = z.infer<typeof tripRequestSchema>;
export type TripStatusUpdate = z.infer<typeof tripStatusSchema>;

export const tripArrivalSchema = z.object({
  token: z.string().min(32).max(128),
});

export type TripArrivalRequest = z.infer<typeof tripArrivalSchema>;
