/**
 * Products Search Route
 * @location /server/routes/products.search.route.ts
 */

import { Router } from "express";
import { searchProducts } from "../controllers/products.search.controller.js";

const router = Router();

router.get("/search", searchProducts);

export default router;