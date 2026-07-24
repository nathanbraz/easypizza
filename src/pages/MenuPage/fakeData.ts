export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

export const fakeProducts: Product[] = [
  { id: '1', name: 'Pizza Calabresa', description: 'Calabresa defumada fatiada, cebola e azeitonas, coberta por queijo premium.', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60', categoryId: 'pizza', isAvailable: true },
  { id: '2', name: 'Margherita Suprema', description: 'Mussarela de búfala derretida, tomate fresco e folhas de manjericão.', price: 42.0, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=60', categoryId: 'pizza', isAvailable: true },
  { id: '3', name: 'Quatro Queijos', description: 'Combinação perfeita de mussarela, provolone, parmesão e gorgonzola.', price: 55.0, imageUrl: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&auto=format&fit=crop&q=60', categoryId: 'pizza', isAvailable: true },
  { id: '4', name: 'Frango com Catupiry', description: 'Frango desfiado temperado com verdadeiro Catupiry.', price: 50.0, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60', categoryId: 'pizza', isAvailable: true }
];

export const fakeDrinks: Product[] = [
  { id: '101', name: 'Coca-Cola 2L', description: 'Gelada', price: 12.0, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60', categoryId: 'drink', isAvailable: true },
  { id: '102', name: 'Guaraná Antarctica 2L', description: 'Gelado', price: 10.0, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60', categoryId: 'drink', isAvailable: true }
];

export const pizzaSizes = [
  { id: 'sm', name: 'Pequena (4 fatias)', multiplier: 0.7 },
  { id: 'md', name: 'Média (6 fatias)', multiplier: 1 },
  { id: 'lg', name: 'Grande (8 fatias)', multiplier: 1.2 }
];

export const crustOptions = [
  { id: 'normal', name: 'Massa Tradicional', price: 0 },
  { id: 'thin', name: 'Massa Fina', price: 0 },
  { id: 'catupiry', name: 'Borda Recheada de Catupiry', price: 8 },
  { id: 'cheddar', name: 'Borda Recheada de Cheddar', price: 8 }
];

export const addons = [
  { id: 'bacon', name: 'Bacon Extra', price: 5 },
  { id: 'cheese', name: 'Queijo Extra', price: 6 },
  { id: 'olives', name: 'Azeitonas Extra', price: 3 }
];
