export interface ProductAddon {
  id: string;
  name: string;
  additionalPrice: number;
  categoryId?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  imageUrls?: string[];
  isAvailable: boolean;
  addons?: ProductAddon[]; // Frontend injected
  categoryName?: string; // Optional field for UI ease
}

export interface ProductCategory {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
  addons?: ProductAddon[];
}
