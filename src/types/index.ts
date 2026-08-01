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
  addons?: ProductAddon[]; // Injetado pelo frontend
  categoryName?: string; // Campo opcional para facilitar a UI
  allowsHalfAndHalf?: boolean; // Injetado pelo frontend (da categoria)
  optionGroups?: any[];
}

export interface ProductCategory {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
  addons?: ProductAddon[];
  allowsHalfAndHalf?: boolean;
}
