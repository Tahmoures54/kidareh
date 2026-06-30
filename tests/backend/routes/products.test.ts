import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import productsRouter from '../products';

const app = express();
app.use(express.json());
app.use('/api/products', productsRouter);

describe('Products API', () => {
  it('GET /api/products - »«Ìœ ·Ì”  „Õ’Ê·«  —« »—ê—œ«‰œ', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  it('POST /api/products - »«Ìœ „Õ’Ê· ÃœÌœ «ÌÃ«œ ò‰œ', async () => {
    const newProduct = {
      title: '„Õ’Ê·  ” Ì',
      price: 500000,
      description: ' Ê÷ÌÕ«   ” '
    };

    const response = await request(app)
      .post('/api/products')
      .send(newProduct)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newProduct.title);
  });
});