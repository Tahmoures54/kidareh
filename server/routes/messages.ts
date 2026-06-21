import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * GET /api/messages/conversations
 * فعلاً واقعی و بدون فیک: لیست خالی
 */
router.get("/conversations", async (_req: Request, res: Response) => {
  try {
    return res.status(200).json([]);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;