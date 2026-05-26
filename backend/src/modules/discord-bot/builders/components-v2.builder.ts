import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { ShopProduct } from '../../shop/entities/shop-product.entity';

export interface ProductCardOptions {
  /** 구매 버튼 customId 생성기. 기본: `buy:${productId}` */
  buyCustomId?: (productId: string) => string;
  /** 사용자 잔액. 부족 시 버튼 disabled. */
  userBalance?: bigint;
  /** 마켓 게이트 통과 여부. false면 버튼 disabled. */
  gatePassed?: boolean;
}

/**
 * 상품 카드 — 임시 Embed 페이로드 형태로 반환.
 *
 * Components V2 (Container/TextDisplay/MediaGallery)는 raw JSON 페이로드를 요구하지만
 * discord.js 빌더가 정식 지원하기 전까지는 호환 가능한 embed + button 조합으로 표시한다.
 * 추후 Components V2 정식 지원 시 본 함수만 교체.
 */
export function buildProductCard(
  product: ShopProduct,
  opts: ProductCardOptions = {},
): {
  embed: {
    title: string;
    description: string;
    color: number;
    fields: { name: string; value: string; inline?: boolean }[];
    thumbnail?: { url: string };
    image?: { url: string };
  };
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const buyId = opts.buyCustomId?.(product.id) ?? `buy:${product.id}`;
  const price = BigInt(product.price ?? '0');
  const insufficient =
    opts.userBalance !== undefined && opts.userBalance < price;
  const disabled =
    product.stock <= 0 || insufficient || opts.gatePassed === false;

  const fields = [
    { name: '가격', value: `${price.toString()} P`, inline: true },
    { name: '재고', value: String(product.stock ?? 0), inline: true },
  ];
  if (product.category) {
    fields.push({ name: '카테고리', value: product.category, inline: true });
  }
  if (opts.gatePassed === false) {
    fields.push({
      name: '안내',
      value: '마켓 게이트 미통과 (출석 7일 + 내전 2회 필요)',
      inline: false,
    });
  }

  const embed = {
    title: product.name,
    description: product.description ?? '',
    color: 0xf99e1a, // POTG primary
    fields,
    ...(product.imageUrl ? { image: { url: product.imageUrl } } : {}),
  };

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buyId)
      .setLabel(disabled ? '구매 불가' : '구매')
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(disabled),
  );

  return { embed, components: [row] };
}
