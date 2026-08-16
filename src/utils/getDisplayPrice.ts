import { formatCurrency } from './formatCurrency';

interface PriceableProduct {
  price: number;
  optionGroups?: any[];
}

// Preço "de vitrine" de um produto — usado tanto no cardápio do cliente quanto na listagem e no
// formulário do admin, pra sempre mostrarem o mesmo valor. É a mesma conta que o backend faz pra
// achar o preço mínimo de um pedido válido (Preço Base + a opção mais barata de cada grupo
// obrigatório) — nunca só um dos dois isoladamente, senão um produto com Preço Base > 0 E Tamanho
// obrigatório mostraria um valor menor do que o cliente realmente paga no checkout.
export function getDisplayPrice(product: PriceableProduct): string {
  let minAdditionalPrice = 0;
  let hasMandatoryOptions = false;

  if (product.optionGroups && product.optionGroups.length > 0) {
    product.optionGroups.forEach((group: any) => {
      if (group.minChoices > 0 && group.options && group.options.length > 0) {
        hasMandatoryOptions = true;
        // Encontra a opção mais barata deste grupo obrigatório
        const cheapestOption = Math.min(...group.options.map((o: any) => o.additionalPrice));
        minAdditionalPrice += (cheapestOption * group.minChoices);
      }
    });
  }

  const total = product.price + minAdditionalPrice;

  if (hasMandatoryOptions) {
    return total > 0 ? `A partir de R$ ${formatCurrency(total)}` : 'Grátis';
  }

  if (product.price > 0) {
    return `R$ ${formatCurrency(product.price)}`;
  }

  if (product.optionGroups && product.optionGroups.length > 0) {
    return 'Ver opções';
  }

  return 'Grátis';
}
