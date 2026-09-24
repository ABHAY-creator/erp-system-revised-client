import prisma from '../db';

export type IdPrefix = 'CUS' | 'PROD' | 'QUO' | 'SO' | 'SHP';

export async function generateNextId(prefix: IdPrefix): Promise<string> {
  let highestNum = 0;

  switch (prefix) {
    case 'CUS': {
      const last = await prisma.customer.findFirst({
        orderBy: { customerId: 'desc' },
        select: { customerId: true },
      });
      if (last?.customerId) {
        const num = parseInt(last.customerId.replace(/^CUS-/, ''), 10);
        if (!isNaN(num)) highestNum = num;
      }
      break;
    }
    case 'PROD': {
      const last = await prisma.product.findFirst({
        orderBy: { productId: 'desc' },
        select: { productId: true },
      });
      if (last?.productId) {
        const num = parseInt(last.productId.replace(/^PROD-/, ''), 10);
        if (!isNaN(num)) highestNum = num;
      }
      break;
    }
    case 'QUO': {
      const last = await prisma.quotation.findFirst({
        orderBy: { quoteId: 'desc' },
        select: { quoteId: true },
      });
      if (last?.quoteId) {
        const num = parseInt(last.quoteId.replace(/^QUO-/, ''), 10);
        if (!isNaN(num)) highestNum = num;
      }
      break;
    }
    case 'SO': {
      const last = await prisma.salesOrder.findFirst({
        orderBy: { soId: 'desc' },
        select: { soId: true },
      });
      if (last?.soId) {
        const num = parseInt(last.soId.replace(/^SO-/, ''), 10);
        if (!isNaN(num)) highestNum = num;
      }
      break;
    }
    case 'SHP': {
      const last = await prisma.salesOrder.findFirst({
        where: { shipmentId: { not: null } },
        orderBy: { shipmentId: 'desc' },
        select: { shipmentId: true },
      });
      if (last?.shipmentId) {
        const num = parseInt(last.shipmentId.replace(/^SHP-/, ''), 10);
        if (!isNaN(num)) highestNum = num;
      }
      break;
    }
  }

  const nextNum = highestNum + 1;
  const padded = String(nextNum).padStart(5, '0');
  return `${prefix}-${padded}`;
}
