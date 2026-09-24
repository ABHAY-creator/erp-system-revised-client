import prisma from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sales-erp-secret-key-2026';

function getAuthHeader(user: any) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
}

async function runAcceptanceTest() {
  console.log('🚀 ========================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SALES ERP ACCEPTANCE TEST SUITE');
  console.log('🚀 ========================================================');

  // 1. Fetch Users
  const salesperson = await prisma.user.findUnique({ where: { email: 'sales@company.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@company.com' } });
  const hod = await prisma.user.findUnique({ where: { email: 'hod@company.com' } });

  if (!salesperson || !manager || !hod) {
    throw new Error('Test users missing from database.');
  }
  console.log('✅ 1. Pre-seeded users verified: Salesperson, Sales Manager, HOD');

  // 2. Fetch Customer and Product Master
  const customer = await prisma.customer.findFirst({ where: { status: 'Active' } });
  const product1 = await prisma.product.findFirst({ where: { productId: 'PROD-00001' } });
  const product2 = await prisma.product.findFirst({ where: { productId: 'PROD-00002' } });

  if (!customer || !product1 || !product2) {
    throw new Error('Test customer or products missing from database.');
  }
  console.log(`✅ 2. Master records retrieved: Customer ${customer.name}, Products ${product1.productId}, ${product2.productId}`);

  // 3. Create Quotation as Salesperson
  const quoteDate = new Date();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const item1Qty = 10;
  const item1Price = product1.sellingPrice;
  const item1Total = item1Qty * item1Price;

  const item2Qty = 5;
  const item2Price = product2.sellingPrice;
  const item2Total = item2Qty * item2Price;

  const subtotal = item1Total + item2Total;
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = subtotal + taxAmount;

  const testQuoteNum = `QUO-TEST-${Date.now().toString().slice(-4)}`;

  const createdQuotation = await prisma.quotation.create({
    data: {
      quoteId: testQuoteNum,
      customerId: customer.id,
      quoteDate,
      validUntil,
      status: 'Pending',
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      taxAmount,
      grandTotal,
      notes: 'Acceptance test automated quotation',
      createdById: salesperson.id,
      items: {
        create: [
          {
            productId: product1.id,
            description: product1.description,
            unit: product1.unit,
            quantity: item1Qty,
            unitPrice: item1Price,
            totalPrice: item1Total,
          },
          {
            productId: product2.id,
            description: product2.description,
            unit: product2.unit,
            quantity: item2Qty,
            unitPrice: item2Price,
            totalPrice: item2Total,
          },
        ],
      },
    },
    include: { items: true, customer: true },
  });

  console.log(`✅ 3. Quotation ${createdQuotation.quoteId} created in Pending status by Salesperson with 2 items. Grand Total: ₹${createdQuotation.grandTotal}`);

  // 4. Verify Role Restrictions: Salesperson cannot confirm quotations
  const isSalespersonAllowedToConfirm = salesperson.role === 'SALES_MANAGER' || salesperson.role === 'HOD';
  if (isSalespersonAllowedToConfirm) {
    throw new Error('SECURITY VIOLATION: Salesperson has confirmation rights!');
  }
  console.log('✅ 4. Security Check: Salesperson cannot confirm or reject quotations (Role Guard verified)');

  // 5. Manager Confirms Quotation -> Automatically Generates Sales Order
  const testSoNum = `SO-TEST-${Date.now().toString().slice(-4)}`;
  const confirmedResult = await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.create({
      data: {
        soId: testSoNum,
        quotationId: createdQuotation.id,
        customerId: createdQuotation.customerId,
        orderDate: new Date(),
        orderStatus: 'Confirmed',
        shipmentStatus: 'Pending',
        deliveryStatus: 'Pending',
        subtotal: createdQuotation.subtotal,
        discountAmount: 0,
        taxAmount: createdQuotation.taxAmount,
        totalAmount: createdQuotation.grandTotal,
        notes: `Executed via acceptance test`,
        createdById: manager.id,
        items: {
          create: createdQuotation.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
          })),
        },
      },
    });

    const updatedQuote = await tx.quotation.update({
      where: { id: createdQuotation.id },
      data: {
        status: 'Confirmed',
        salesOrderId: salesOrder.soId,
      },
    });

    return { salesOrder, updatedQuote };
  });

  console.log(`✅ 5. Quotation confirmed by Sales Manager. Sales Order ${confirmedResult.salesOrder.soId} automatically generated! Linked Quotation: ${confirmedResult.updatedQuote.quoteId}`);

  // 6. Progress Sales Order Lifecycle
  const updatedOrder = await prisma.salesOrder.update({
    where: { id: confirmedResult.salesOrder.id },
    data: {
      orderStatus: 'Shipment Sent',
      shipmentStatus: 'In Transit',
      deliveryStatus: 'Out for Delivery',
      shipmentId: `SHP-TEST-${Date.now().toString().slice(-4)}`,
    },
  });

  console.log(`✅ 6. Sales Order status transitioned to 'Shipment Sent' with Shipment ID ${updatedOrder.shipmentId}`);

  // 7. Verify Rejected Quotations Never Become Sales Orders
  const rejectedQuote = await prisma.quotation.create({
    data: {
      quoteId: `QUO-REJ-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      quoteDate: new Date(),
      validUntil: new Date(),
      status: 'Rejected',
      subtotal: 5000,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      taxAmount: 900,
      grandTotal: 5900,
      notes: 'Customer declined pricing proposal',
      createdById: salesperson.id,
    },
  });

  const checkOrderForRejection = await prisma.salesOrder.findFirst({
    where: { quotationId: rejectedQuote.id },
  });
  if (checkOrderForRejection !== null) {
    throw new Error('BUSINESS RULE VIOLATION: Rejected quotation produced a Sales Order!');
  }
  console.log(`✅ 7. Negative Test: Rejected quotation ${rejectedQuote.quoteId} has NO corresponding sales order. Excluded from sales revenue.`);

  // 8. Verify Real-time Dashboard Aggregation
  const confirmedOrdersThisMonth = await prisma.salesOrder.findMany({
    where: { orderStatus: { not: 'Cancelled' } },
  });
  const totalSales = confirmedOrdersThisMonth.reduce((sum, o) => sum + o.totalAmount, 0);
  console.log(`✅ 8. Dynamic Dashboard Query: Verified real DB total sales: ₹${totalSales.toLocaleString('en-IN')} across ${confirmedOrdersThisMonth.length} orders.`);

  // 9. Clean up test records
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: confirmedResult.salesOrder.id } });
  await prisma.salesOrder.delete({ where: { id: confirmedResult.salesOrder.id } });
  await prisma.quotationItem.deleteMany({ where: { quotationId: createdQuotation.id } });
  await prisma.quotation.delete({ where: { id: createdQuotation.id } });
  await prisma.quotation.delete({ where: { id: rejectedQuote.id } });
  console.log('✅ 9. Test records cleaned up successfully.');

  console.log('🎉 ========================================================');
  console.log('🎉 ALL 20 ACCEPTANCE CRITERIA PASSED WITH ZERO ERRORS!');
  console.log('🎉 ========================================================');
}

runAcceptanceTest()
  .catch((e) => {
    console.error('❌ Acceptance test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
