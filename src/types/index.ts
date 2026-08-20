export interface ProductAddon {
  id: string;
  name: string;
  additionalPrice: number;
  categoryId?: string;
}

// Estratégia usada pra calcular o preço da combinação quando o cliente escolhe mais de um
// sabor (grupo compartilhado com isFlavorGroup=true) — mesmos valores do enum FlavorPriceStrategy
// no backend.
export type FlavorPriceStrategy = 'MaisCaro' | 'Soma' | 'Media' | 'MaisBarato' | 0 | 1 | 2 | 3;

export interface ProductOptionItem {
  id: string;
  name: string;
  additionalPrice: number;
  displayOrder: number;
  // Só preenchido em itens do grupo de Sabores: qual Produto este item representa.
  linkedProductId?: string | null;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  groupType: string;
  isRequired: boolean;
  minChoices: number;
  maxChoices: number;
  displayOrder: number;
  isShared: boolean;
  // true = este é o grupo de Sabores da categoria (generaliza o Meio a Meio) — itens nele
  // referenciam Produtos de verdade da mesma categoria via ProductOptionItem.linkedProductId.
  isFlavorGroup?: boolean;
  flavorPriceStrategy?: FlavorPriceStrategy;
  options: ProductOptionItem[];
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
  optionGroups?: ProductOptionGroup[];
  showInCrossSell?: boolean;
  crossSellDiscountPrice?: number | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
  addons?: ProductAddon[];
}
