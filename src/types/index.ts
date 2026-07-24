export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  addons?: ProductAddon[];
  categoryName?: string; // Optional field for UI ease
}

export interface ProductCategory {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
}
