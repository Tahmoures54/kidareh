import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import productsRouter from '../../../server/routes/products';

const app = express();
app.use(express.json());
app.use('/api/products', productsRouter);

describe('Products API', () => {
  it('GET /api/products - ÈÇíÏ áíÓÊ ãÍÕæáÇÊ ÑÇ ÈÑÑÏÇäÏ', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  it('POST /api/products - ÈÇíÏ ãÍÕæá ÌÏíÏ ÇíÌÇÏ ˜äÏ', async () => {
    const newProduct = {
      title: 'ãÍÕæá ÊÓÊí',
      price: 500000,
      description: 'ÊæÖíÍÇÊ ÊÓÊ'
    };

    const response = await request(app)
      .post('/api/products')
      .send(newProduct)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newProduct.title);
  });
});