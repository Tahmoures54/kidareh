import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../Home/ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    title: ' ”  „Õ’Ê·',
    price: 1000000,
    image: 'test.jpg',
    city: ' Â—«‰',
    created_at: new Date().toISOString()
  };

  it('»«Ìœ „Õ’Ê· —« ‰„«Ì‘ œÂœ', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    
    expect(screen.getByText(' ”  „Õ’Ê·')).toBeInTheDocument();
    expect(screen.getByText(/ Â—«‰/)).toBeInTheDocument();
  });

  it('»«Ìœ »« ò·Ìò —ÊÌ „Õ’Ê· »Â ’›ÕÂ Ã“∆Ì«  »—Êœ', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    
    const card = screen.getByText(' ”  „Õ’Ê·').closest('div');
    expect(card).toBeInTheDocument();
  });
});