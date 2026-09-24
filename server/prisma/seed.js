"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Sales ERP Database Seeding...');
    // 1. Clean existing records safely
    await prisma.auditLog.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.quotationItem.deleteMany();
    await prisma.quotation.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    // 2. Seed Users
    const hodPasswordHash = await bcryptjs_1.default.hash('hod123', 10);
    const managerPasswordHash = await bcryptjs_1.default.hash('manager123', 10);
    const salesPasswordHash = await bcryptjs_1.default.hash('sales123', 10);
    const hod = await prisma.user.create({
        data: {
            username: 'hod',
            email: 'hod@company.com',
            passwordHash: hodPasswordHash,
            name: 'Vikram Sharma',
            phone: '+91 98470 11001',
            role: 'HOD',
            status: 'Active',
        },
    });
    const manager = await prisma.user.create({
        data: {
            username: 'manager',
            email: 'manager@company.com',
            passwordHash: managerPasswordHash,
            name: 'Priya Nair',
            phone: '+91 98470 22002',
            role: 'SALES_MANAGER',
            status: 'Active',
        },
    });
    const salesperson = await prisma.user.create({
        data: {
            username: 'sales',
            email: 'sales@company.com',
            passwordHash: salesPasswordHash,
            name: 'Rahul Verma',
            phone: '+91 98470 33003',
            role: 'SALESPERSON',
            status: 'Active',
        },
    });
    console.log('✅ Users seeded: HOD, Sales Manager, Salesperson');
    // 3. Seed Products (Product Master only, NO stock fields)
    const productsData = [
        {
            productId: 'PROD-00001',
            name: 'Premium Vitrified Porcelain Floor Tile',
            image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80',
            description: 'High-gloss polished porcelain floor tile for commercial lobbies.',
            productType: 'Single',
            unit: 'PCS',
            pairQuantity: 2,
            boxQuantity: 8,
            bundleQuantity: 40,
            sellingPrice: 850.0,
            status: 'Active',
            notes: 'Standard 600x600mm sizing',
        },
        {
            productId: 'PROD-00002',
            name: 'Architectural Brushed Brass Door Handles',
            image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80',
            description: 'Solid brass lever handle set with corrosion-resistant coating.',
            productType: 'Pair',
            unit: 'PAIR',
            pairQuantity: 2,
            boxQuantity: 12,
            bundleQuantity: 60,
            sellingPrice: 1450.0,
            status: 'Active',
            notes: 'Supplied as pair (left + right)',
        },
        {
            productId: 'PROD-00003',
            name: 'Acoustic Sound-Dampening Wall Panels',
            image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80',
            description: 'Fabric-wrapped architectural sound absorption panels.',
            productType: 'Box',
            unit: 'BOX',
            pairQuantity: 2,
            boxQuantity: 10,
            bundleQuantity: 50,
            sellingPrice: 7200.0,
            status: 'Active',
            notes: 'Packaged 10 units per master box',
        },
        {
            productId: 'PROD-00004',
            name: 'Commercial Linear LED Suspension Kit',
            image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=300&q=80',
            description: 'Dimmable 4000K natural white linear office luminaire fixture.',
            productType: 'Bundle',
            unit: 'BUNDLE',
            pairQuantity: 2,
            boxQuantity: 5,
            bundleQuantity: 20,
            sellingPrice: 28500.0,
            status: 'Active',
            notes: 'Bundle covers 20 luminaires and suspension cables',
        },
        {
            productId: 'PROD-00005',
            name: 'Anodized Aluminum Facade Cladding Set',
            image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?w=300&q=80',
            description: 'Engineered exterior cladding panels customized for commercial elevations.',
            productType: 'Custom',
            unit: 'SET',
            pairQuantity: 2,
            boxQuantity: 1,
            bundleQuantity: 1,
            sellingPrice: 95000.0,
            status: 'Active',
            notes: 'Pre-fabricated per project drawings',
        },
        {
            productId: 'PROD-00006',
            name: 'Heavy Duty Stainless Steel Pivot Hinges',
            image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80',
            description: '304 Grade ball bearing pivot hinges for oversized doors.',
            productType: 'Pair',
            unit: 'PAIR',
            pairQuantity: 2,
            boxQuantity: 20,
            bundleQuantity: 100,
            sellingPrice: 920.0,
            status: 'Active',
            notes: 'Load rated up to 120kg',
        },
        {
            productId: 'PROD-00007',
            name: 'Tempered Glass Balustrade Brackets',
            image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80',
            description: 'Side-mount satin finish glass clamps for balconies.',
            productType: 'Single',
            unit: 'PCS',
            pairQuantity: 2,
            boxQuantity: 16,
            bundleQuantity: 64,
            sellingPrice: 1850.0,
            status: 'Active',
            notes: 'Includes silicone gasket pack',
        },
        {
            productId: 'PROD-00008',
            name: 'Engineered Oak Wood Flooring Planks',
            image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=300&q=80',
            description: 'Multi-layer European white oak click-lock flooring.',
            productType: 'Box',
            unit: 'BOX',
            pairQuantity: 2,
            boxQuantity: 12,
            bundleQuantity: 48,
            sellingPrice: 11400.0,
            status: 'Active',
            notes: '12 planks per carton covering 2.4 sq.m',
        },
    ];
    const products = [];
    for (const p of productsData) {
        const prod = await prisma.product.create({ data: p });
        products.push(prod);
    }
    console.log(`✅ Products seeded: ${products.length} master catalogue items`);
    // 4. Seed Customers
    const customersData = [
        {
            customerId: 'CUS-00001',
            name: 'Apex Horizon Builders & Developers',
            email: 'procurement@apexhorizon.com',
            phone: '+91 80 4123 5500',
            address: 'Plot 45, Whitefield Tech Corridor, Bengaluru, Karnataka 560066',
            notes: 'Tier-1 commercial builder. Prefers monthly consolidated billing.',
            status: 'Active',
        },
        {
            customerId: 'CUS-00002',
            name: 'Skyline Urban Infrastructure Ltd',
            email: 'contracts@skylineurban.in',
            phone: '+91 22 6677 8899',
            address: 'Level 14, Tower B, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
            notes: 'High-volume luxury residential towers.',
            status: 'Active',
        },
        {
            customerId: 'CUS-00003',
            name: 'GreenLeaf Commercial Spaces',
            email: 'purchase@greenleafspaces.com',
            phone: '+91 484 290 1122',
            address: 'Infopark Expressway, Kakkanad, Kochi, Kerala 682042',
            notes: 'Specializes in IT parks and corporate fit-outs.',
            status: 'Active',
        },
        {
            customerId: 'CUS-00004',
            name: 'Heritage Luxury Living Projects',
            email: 'supply@heritageliving.org',
            phone: '+91 40 2345 6789',
            address: 'Road No 36, Jubilee Hills, Hyderabad, Telangana 500033',
            notes: 'High-end villas and hospitality resorts.',
            status: 'Active',
        },
        {
            customerId: 'CUS-00005',
            name: 'Nova Design Studios & Associates',
            email: 'admin@novadesignstudios.in',
            phone: '+91 44 2811 9900',
            address: 'Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
            notes: 'Architectural boutique firm.',
            status: 'Active',
        },
    ];
    const customers = [];
    for (const c of customersData) {
        const cust = await prisma.customer.create({ data: c });
        customers.push(cust);
    }
    console.log(`✅ Customers seeded: ${customers.length} commercial customers`);
    // 5. Seed Historical Quotations & Sales Orders
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    // Helper date generators
    const daysAgo = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() - days);
        return d;
    };
    const monthsAgoDate = (m, dayOfMonth = 15) => {
        return new Date(currentYear, currentMonth - m, dayOfMonth, 11, 0, 0);
    };
    const pastYearDate = (m, dayOfMonth = 15) => {
        return new Date(currentYear - 1, m, dayOfMonth, 14, 0, 0);
    };
    let quoteCounter = 1;
    let soCounter = 1;
    let shpCounter = 1;
    async function createQuotationWithFlow(params) {
        const qNum = `QUO-${String(quoteCounter++).padStart(5, '0')}`;
        const cust = customers[params.customerIdx];
        let subtotal = 0;
        const lineItems = params.items.map((it) => {
            const prod = products[it.prodIdx];
            const tot = prod.sellingPrice * it.qty;
            subtotal += tot;
            return {
                productId: prod.id,
                description: prod.description,
                unit: prod.unit,
                quantity: it.qty,
                unitPrice: prod.sellingPrice,
                totalPrice: tot,
            };
        });
        const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
        const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
        const validUntil = new Date(params.date);
        validUntil.setDate(validUntil.getDate() + params.validityDays);
        let salesOrderId = undefined;
        const quotation = await prisma.quotation.create({
            data: {
                quoteId: qNum,
                customerId: cust.id,
                quoteDate: params.date,
                validUntil,
                status: params.status,
                subtotal,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 18,
                taxAmount,
                grandTotal,
                notes: `Quotation requested for project phase by ${cust.name}`,
                createdById: params.user.id,
                createdAt: params.date,
                items: {
                    create: lineItems,
                },
            },
        });
        // If Confirmed, create linked Sales Order
        if (params.status === 'Confirmed') {
            const soNum = `SO-${String(soCounter++).padStart(5, '0')}`;
            const oStatus = params.orderStatus || 'Confirmed';
            let shipmentStatus = 'Pending';
            let deliveryStatus = 'Pending';
            let shipmentId = null;
            if (oStatus === 'Processing') {
                shipmentStatus = 'Pending';
                deliveryStatus = 'Pending';
            }
            else if (oStatus === 'Shipment Sent') {
                shipmentStatus = 'In Transit';
                deliveryStatus = 'Out for Delivery';
                shipmentId = `SHP-${String(shpCounter++).padStart(5, '0')}`;
            }
            else if (oStatus === 'Delivered') {
                shipmentStatus = 'Delivered';
                deliveryStatus = 'Delivered';
                shipmentId = `SHP-${String(shpCounter++).padStart(5, '0')}`;
            }
            const salesOrder = await prisma.salesOrder.create({
                data: {
                    soId: soNum,
                    quotationId: quotation.id,
                    customerId: cust.id,
                    orderDate: params.date,
                    orderStatus: oStatus,
                    shipmentStatus,
                    deliveryStatus,
                    shipmentId,
                    subtotal,
                    discountAmount: 0,
                    taxAmount,
                    totalAmount: grandTotal,
                    notes: `Sales order executed under quotation ${qNum}`,
                    createdById: params.user.id,
                    createdAt: params.date,
                    items: {
                        create: lineItems.map((li) => ({
                            productId: li.productId,
                            description: li.description,
                            unit: li.unit,
                            quantity: li.quantity,
                            unitPrice: li.unitPrice,
                            totalPrice: li.totalPrice,
                        })),
                    },
                },
            });
            salesOrderId = salesOrder.soId;
            await prisma.quotation.update({
                where: { id: quotation.id },
                data: { salesOrderId: salesOrder.soId },
            });
        }
        return quotation;
    }
    // --- Seed Current Month Data ---
    await createQuotationWithFlow({
        customerIdx: 0,
        user: salesperson,
        date: daysAgo(2),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Processing',
        items: [
            { prodIdx: 0, qty: 150 }, // Tiles
            { prodIdx: 2, qty: 25 }, // Panels
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 1,
        user: manager,
        date: daysAgo(5),
        validityDays: 15,
        status: 'Confirmed',
        orderStatus: 'Shipment Sent',
        items: [
            { prodIdx: 3, qty: 4 }, // LED bundle
            { prodIdx: 4, qty: 2 }, // Facade
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 2,
        user: salesperson,
        date: daysAgo(8),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [
            { prodIdx: 1, qty: 80 }, // Handles
            { prodIdx: 5, qty: 100 }, // Hinges
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 3,
        user: salesperson,
        date: daysAgo(1),
        validityDays: 14,
        status: 'Pending',
        items: [
            { prodIdx: 7, qty: 40 }, // Oak flooring
            { prodIdx: 6, qty: 30 }, // Glass brackets
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 4,
        user: salesperson,
        date: daysAgo(3),
        validityDays: 7,
        status: 'Pending',
        items: [
            { prodIdx: 0, qty: 200 },
            { prodIdx: 1, qty: 40 },
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 0,
        user: salesperson,
        date: daysAgo(6),
        validityDays: 10,
        status: 'Rejected',
        items: [
            { prodIdx: 4, qty: 3 }, // Custom facade rejected
        ],
    });
    // --- Seed Previous Month Data (for MoM calculations) ---
    await createQuotationWithFlow({
        customerIdx: 1,
        user: salesperson,
        date: monthsAgoDate(1, 10),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [
            { prodIdx: 0, qty: 120 },
            { prodIdx: 7, qty: 30 },
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 2,
        user: manager,
        date: monthsAgoDate(1, 18),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [
            { prodIdx: 3, qty: 2 },
            { prodIdx: 2, qty: 15 },
        ],
    });
    await createQuotationWithFlow({
        customerIdx: 3,
        user: salesperson,
        date: monthsAgoDate(1, 24),
        validityDays: 15,
        status: 'Rejected',
        items: [
            { prodIdx: 4, qty: 1 },
        ],
    });
    // --- Seed Earlier Months (Months 2, 3, 4 ago) ---
    await createQuotationWithFlow({
        customerIdx: 0,
        user: salesperson,
        date: monthsAgoDate(2, 5),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [{ prodIdx: 0, qty: 300 }],
    });
    await createQuotationWithFlow({
        customerIdx: 4,
        user: manager,
        date: monthsAgoDate(2, 20),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [{ prodIdx: 7, qty: 50 }, { prodIdx: 1, qty: 60 }],
    });
    await createQuotationWithFlow({
        customerIdx: 1,
        user: salesperson,
        date: monthsAgoDate(3, 12),
        validityDays: 30,
        status: 'Confirmed',
        orderStatus: 'Delivered',
        items: [{ prodIdx: 3, qty: 3 }],
    });
    // --- Seed Previous Year Data (for YoY comparisons) ---
    for (let m = 0; m < 12; m += 2) {
        await createQuotationWithFlow({
            customerIdx: m % 5,
            user: salesperson,
            date: pastYearDate(m, 14),
            validityDays: 30,
            status: 'Confirmed',
            orderStatus: 'Delivered',
            items: [
                { prodIdx: (m % 4), qty: 50 + m * 10 },
                { prodIdx: (m % 3) + 1, qty: 10 + m * 2 },
            ],
        });
    }
    // 6. Seed Initial Audit Logs
    await prisma.auditLog.createMany({
        data: [
            {
                userName: 'Vikram Sharma',
                userRole: 'HOD',
                action: 'System Seed Initialized',
                module: 'System',
                recordId: 'SYS-INIT',
                details: 'Initial database seed populated with products, customers, and test sales records.',
            },
            {
                userName: 'Priya Nair',
                userRole: 'SALES_MANAGER',
                action: 'Confirmed Quotation',
                module: 'Quotation',
                recordId: 'QUO-00001',
                details: 'Confirmed quotation QUO-00001 and generated SO-00001',
            },
        ],
    });
    console.log('🎉 Seeding successfully completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
