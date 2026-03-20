import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('Seeding Brand OS database...')

  // ─── 1. Brand ────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { email: 'eagle@brandos.eg' },
    update: {},
    create: {
      name: 'Eagle Fashion',
      email: 'eagle@brandos.eg',
      language: 'en',
      currency: 'EGP',
    },
  })

  // ─── 2. Admin user ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('pass123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@brandos.eg' },
    update: {},
    create: {
      email: 'admin@brandos.eg',
      passwordHash,
      name: 'Ahmed Admin',
      brandId: brand.id,
      role: 'owner',
    },
  })

  // ─── Clean slate for idempotent re-seeding ───────────────────────────────────
  await prisma.bazaarInventory.deleteMany({ where: { event: { brandId: brand.id } } })
  await prisma.posOrderItem.deleteMany({ where: { posOrder: { brandId: brand.id } } })
  await prisma.posOrder.deleteMany({ where: { brandId: brand.id } })
  await prisma.orderItem.deleteMany({ where: { order: { brandId: brand.id } } })
  await prisma.shipment.deleteMany({ where: { brandId: brand.id } })
  await prisma.order.deleteMany({ where: { brandId: brand.id } })
  await prisma.bazaarEvent.deleteMany({ where: { brandId: brand.id } })
  await prisma.product.deleteMany({ where: { brandId: brand.id } })
  await prisma.expense.deleteMany({ where: { brandId: brand.id } })
  await prisma.marketingSnapshot.deleteMany({ where: { brandId: brand.id } })
  await prisma.aiInsight.deleteMany({ where: { brandId: brand.id } })

  // ─── 3. Products (10) ────────────────────────────────────────────────────────
  // Linen Summer 2025 — shirts (3) + pants (2) = 5
  // Basics 2025 — tshirts (2) = 2
  // Winter Essentials 2024 — hoodies (1) = 1
  // Extra 2 to round out to 10
  const products = await prisma.$transaction([
    // [0] White linen shirt M
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'قميص كتان أبيض',
        sku: 'EF-LS-W-M',
        collection: 'Linen Summer 2025',
        category: 'shirts',
        size: 'M',
        color: 'White',
        sellingPrice: 850,
        costPrice: 280,
        stockWarehouse: 45,
        stockShopify: 12,
        stockPhysical: 8,
        lowStockThreshold: 10,
      },
    }),
    // [1] White linen shirt L
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'قميص كتان أبيض',
        sku: 'EF-LS-W-L',
        collection: 'Linen Summer 2025',
        category: 'shirts',
        size: 'L',
        color: 'White',
        sellingPrice: 850,
        costPrice: 280,
        stockWarehouse: 30,
        stockShopify: 9,
        stockPhysical: 5,
        lowStockThreshold: 10,
      },
    }),
    // [2] White linen shirt XL
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'قميص كتان أبيض',
        sku: 'EF-LS-W-XL',
        collection: 'Linen Summer 2025',
        category: 'shirts',
        size: 'XL',
        color: 'White',
        sellingPrice: 850,
        costPrice: 285,
        stockWarehouse: 22,
        stockShopify: 7,
        stockPhysical: 4,
        lowStockThreshold: 10,
      },
    }),
    // [3] Beige linen shirt M
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'قميص كتان بيج',
        sku: 'EF-LS-BG-M',
        collection: 'Linen Summer 2025',
        category: 'shirts',
        size: 'M',
        color: 'Beige',
        sellingPrice: 850,
        costPrice: 290,
        stockWarehouse: 20,
        stockShopify: 7,
        stockPhysical: 4,
        lowStockThreshold: 10,
      },
    }),
    // [4] Beige linen shirt L
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'قميص كتان بيج',
        sku: 'EF-LS-BG-L',
        collection: 'Linen Summer 2025',
        category: 'shirts',
        size: 'L',
        color: 'Beige',
        sellingPrice: 850,
        costPrice: 290,
        stockWarehouse: 15,
        stockShopify: 5,
        stockPhysical: 3,
        lowStockThreshold: 10,
      },
    }),
    // [5] Cream linen pants 32  ← Shopify out-of-stock insight
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'بنطلون كتان كريمي',
        sku: 'EF-LP-CR-32',
        collection: 'Linen Summer 2025',
        category: 'pants',
        size: '32',
        color: 'Cream',
        sellingPrice: 1100,
        costPrice: 380,
        stockWarehouse: 18,
        stockShopify: 0,
        stockPhysical: 3,
        lowStockThreshold: 8,
      },
    }),
    // [6] Cream linen pants 34
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'بنطلون كتان كريمي',
        sku: 'EF-LP-CR-34',
        collection: 'Linen Summer 2025',
        category: 'pants',
        size: '34',
        color: 'Cream',
        sellingPrice: 1100,
        costPrice: 380,
        stockWarehouse: 25,
        stockShopify: 6,
        stockPhysical: 6,
        lowStockThreshold: 8,
      },
    }),
    // [7] Black cotton tee S
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'تيشيرت قطن بيسك أسود',
        sku: 'EF-BT-BK-S',
        collection: 'Basics 2025',
        category: 'tshirts',
        size: 'S',
        color: 'Black',
        sellingPrice: 450,
        costPrice: 120,
        stockWarehouse: 80,
        stockShopify: 25,
        stockPhysical: 15,
        lowStockThreshold: 20,
      },
    }),
    // [8] Black cotton tee M  ← top seller
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'تيشيرت قطن بيسك أسود',
        sku: 'EF-BT-BK-M',
        collection: 'Basics 2025',
        category: 'tshirts',
        size: 'M',
        color: 'Black',
        sellingPrice: 450,
        costPrice: 120,
        stockWarehouse: 60,
        stockShopify: 20,
        stockPhysical: 12,
        lowStockThreshold: 20,
      },
    }),
    // [9] Gray oversized hoodie L  ← low-stock critical
    prisma.product.create({
      data: {
        brandId: brand.id,
        title: 'هوديه أوفرسايز رمادي',
        sku: 'EF-HO-GR-L',
        collection: 'Winter Essentials 2024',
        category: 'hoodies',
        size: 'L',
        color: 'Gray',
        sellingPrice: 1350,
        costPrice: 450,
        stockWarehouse: 5,
        stockShopify: 2,
        stockPhysical: 1,
        lowStockThreshold: 10,
      },
    }),
  ])

  // ─── 4. Orders (15 Shopify) ──────────────────────────────────────────────────
  const orders = await prisma.$transaction([
    // [0] fulfilled / online
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1700,
        paymentMethod: 'online',
        customerName: 'محمد علي',
        customerPhone: '01012345678',
        createdAt: daysAgo(2),
        items: {
          create: [
            { productId: products[0].id, quantity: 1, unitPrice: 850 },
            { productId: products[5].id, quantity: 1, unitPrice: 850 },
          ],
        },
      },
    }),
    // [1] fulfilled / online
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 900,
        paymentMethod: 'online',
        customerName: 'فاطمة أحمد',
        customerPhone: '01098765432',
        createdAt: daysAgo(5),
        items: {
          create: [{ productId: products[8].id, quantity: 2, unitPrice: 450 }],
        },
      },
    }),
    // [2] processing / cod
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'processing',
        totalAmount: 1350,
        paymentMethod: 'cod',
        customerName: 'عمر حسن',
        customerPhone: '01155667788',
        createdAt: daysAgo(1),
        items: {
          create: [{ productId: products[9].id, quantity: 1, unitPrice: 1350 }],
        },
      },
    }),
    // [3] fulfilled / cod  — failed shipment, overdue COD
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1350,
        paymentMethod: 'cod',
        customerName: 'سارة محمود',
        customerPhone: '01234567890',
        createdAt: daysAgo(18),
        items: {
          create: [{ productId: products[9].id, quantity: 1, unitPrice: 1350 }],
        },
      },
    }),
    // [4] fulfilled / online
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1300,
        paymentMethod: 'online',
        customerName: 'ياسمين خالد',
        customerPhone: '01122334455',
        createdAt: daysAgo(7),
        items: {
          create: [
            { productId: products[1].id, quantity: 1, unitPrice: 850 },
            { productId: products[7].id, quantity: 1, unitPrice: 450 },
          ],
        },
      },
    }),
    // [5] fulfilled / cod — 3-item order
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 2400,
        paymentMethod: 'cod',
        customerName: 'خالد إبراهيم',
        customerPhone: '01066778899',
        createdAt: daysAgo(12),
        items: {
          create: [
            { productId: products[0].id, quantity: 1, unitPrice: 850 },
            { productId: products[6].id, quantity: 1, unitPrice: 1100 },
            { productId: products[8].id, quantity: 1, unitPrice: 450 },
          ],
        },
      },
    }),
    // [6] cancelled / cod
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'cancelled',
        totalAmount: 850,
        paymentMethod: 'cod',
        customerName: 'منى سعيد',
        customerPhone: '01099001122',
        createdAt: daysAgo(20),
        items: {
          create: [{ productId: products[3].id, quantity: 1, unitPrice: 850 }],
        },
      },
    }),
    // [7] fulfilled / online
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1700,
        paymentMethod: 'online',
        customerName: 'أحمد طارق',
        customerPhone: '01233445566',
        createdAt: daysAgo(25),
        items: {
          create: [
            { productId: products[2].id, quantity: 1, unitPrice: 850 },
            { productId: products[8].id, quantity: 1, unitPrice: 450 },
          ],
        },
      },
    }),
    // [8] fulfilled / cod — returned shipment
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1100,
        paymentMethod: 'cod',
        customerName: 'نورا جمال',
        customerPhone: '01555443322',
        createdAt: daysAgo(30),
        items: {
          create: [{ productId: products[6].id, quantity: 1, unitPrice: 1100 }],
        },
      },
    }),
    // [9] processing / online
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'processing',
        totalAmount: 1300,
        paymentMethod: 'online',
        customerName: 'رامي سامي',
        customerPhone: '01788996655',
        createdAt: daysAgo(3),
        items: {
          create: [
            { productId: products[4].id, quantity: 1, unitPrice: 850 },
            { productId: products[8].id, quantity: 1, unitPrice: 450 },
          ],
        },
      },
    }),
    // [10] fulfilled / cod
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 450,
        paymentMethod: 'cod',
        customerName: 'هنا وليد',
        customerPhone: '01911223344',
        createdAt: daysAgo(35),
        items: {
          create: [{ productId: products[7].id, quantity: 1, unitPrice: 450 }],
        },
      },
    }),
    // [11] fulfilled / online — 2-item
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1950,
        paymentMethod: 'online',
        customerName: 'كريم منصور',
        customerPhone: '01633221100',
        createdAt: daysAgo(40),
        items: {
          create: [
            { productId: products[0].id, quantity: 1, unitPrice: 850 },
            { productId: products[6].id, quantity: 1, unitPrice: 1100 },
          ],
        },
      },
    }),
    // [12] fulfilled / cod — Alexandria failed delivery
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 850,
        paymentMethod: 'cod',
        customerName: 'سلمى رضا',
        customerPhone: '01044556677',
        createdAt: daysAgo(8),
        items: {
          create: [{ productId: products[3].id, quantity: 1, unitPrice: 850 }],
        },
      },
    }),
    // [13] fulfilled / cod — Alexandria failed delivery
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1100,
        paymentMethod: 'cod',
        customerName: 'حسين فتحي',
        customerPhone: '01877665544',
        createdAt: daysAgo(6),
        items: {
          create: [{ productId: products[5].id, quantity: 1, unitPrice: 1100 }],
        },
      },
    }),
    // [14] fulfilled / online — 2 items
    prisma.order.create({
      data: {
        brandId: brand.id,
        source: 'shopify',
        status: 'fulfilled',
        totalAmount: 1750,
        paymentMethod: 'online',
        customerName: 'دينا حازم',
        customerPhone: '01566778899',
        createdAt: daysAgo(15),
        items: {
          create: [
            { productId: products[1].id, quantity: 1, unitPrice: 850 },
            { productId: products[8].id, quantity: 2, unitPrice: 450 },
          ],
        },
      },
    }),
  ])

  // ─── 5. Shipments (10) ───────────────────────────────────────────────────────
  // 3 delivered, 2 in_transit, 3 failed (Alexandria x2 + overdue), 1 returned, 1 created
  await prisma.$transaction([
    // [0] delivered / online
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[0].id,
        courier: 'aramex',
        trackingNumber: 'ARX-2025-10021',
        status: 'delivered',
        codAmount: 0,
        codStatus: 'not_applicable',
        shippingCost: 75,
        createdAt: daysAgo(2),
      },
    }),
    // [1] delivered / online
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[1].id,
        courier: 'bosta',
        trackingNumber: 'BST-2025-20045',
        status: 'delivered',
        codAmount: 0,
        codStatus: 'not_applicable',
        shippingCost: 60,
        createdAt: daysAgo(5),
      },
    }),
    // [2] created / cod — just dispatched
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[2].id,
        courier: 'aramex',
        trackingNumber: 'ARX-2025-10022',
        status: 'created',
        codAmount: 1350,
        codStatus: 'pending',
        shippingCost: 75,
        createdAt: daysAgo(1),
      },
    }),
    // [3] failed / cod — overdue 18 days
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[3].id,
        courier: 'bosta',
        trackingNumber: 'BST-2025-20046',
        status: 'failed',
        codAmount: 1350,
        codStatus: 'pending',
        shippingCost: 60,
        createdAt: daysAgo(18),
      },
    }),
    // [4] delivered / online
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[4].id,
        courier: 'aramex',
        trackingNumber: 'ARX-2025-10023',
        status: 'delivered',
        codAmount: 0,
        codStatus: 'not_applicable',
        shippingCost: 75,
        createdAt: daysAgo(7),
      },
    }),
    // [5] in_transit / cod
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[5].id,
        courier: 'bosta',
        trackingNumber: 'BST-2025-20047',
        status: 'in_transit',
        codAmount: 2400,
        codStatus: 'pending',
        shippingCost: 65,
        createdAt: daysAgo(12),
      },
    }),
    // [7] in_transit / online
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[7].id,
        courier: 'aramex',
        trackingNumber: 'ARX-2025-10024',
        status: 'in_transit',
        codAmount: 0,
        codStatus: 'not_applicable',
        shippingCost: 75,
        createdAt: daysAgo(25),
      },
    }),
    // [8] returned / cod
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[8].id,
        courier: 'bosta',
        trackingNumber: 'BST-2025-20048',
        status: 'returned',
        codAmount: 1100,
        codStatus: 'pending',
        shippingCost: 60,
        createdAt: daysAgo(30),
      },
    }),
    // [12] failed / cod — Alexandria
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[12].id,
        courier: 'aramex',
        trackingNumber: 'ARX-2025-10025',
        status: 'failed',
        codAmount: 850,
        codStatus: 'pending',
        shippingCost: 85,
        createdAt: daysAgo(8),
      },
    }),
    // [13] failed / cod — Alexandria
    prisma.shipment.create({
      data: {
        brandId: brand.id,
        orderId: orders[13].id,
        courier: 'bosta',
        trackingNumber: 'BST-2025-20049',
        status: 'failed',
        codAmount: 1100,
        codStatus: 'pending',
        shippingCost: 65,
        createdAt: daysAgo(6),
      },
    }),
  ])

  // ─── 6. Bazaar Event + Inventory (5 products) ────────────────────────────────
  const bazaarEvent = await prisma.bazaarEvent.create({
    data: {
      brandId: brand.id,
      name: 'Zamalek Weekend Bazaar',
      location: 'زمالك، القاهرة',
      startDate: daysAgo(4),
      endDate: daysAgo(2),
      status: 'active',
      totalRevenue: 9850,
      inventory: {
        create: [
          { productId: products[0].id, allocated: 12, sold: 7  },
          { productId: products[3].id, allocated: 10, sold: 5  },
          { productId: products[6].id, allocated: 8,  sold: 4  },
          { productId: products[8].id, allocated: 20, sold: 14 },
          { productId: products[9].id, allocated: 5,  sold: 3  },
        ],
      },
    },
  })

  // ─── 7. POS Orders (5) ───────────────────────────────────────────────────────
  await prisma.$transaction([
    prisma.posOrder.create({
      data: {
        brandId: brand.id,
        orderNumber: 'POS-20250315-001',
        eventId: bazaarEvent.id,
        totalAmount: 1700,
        discountAmount: 0,
        finalAmount: 1700,
        paymentMethod: 'cash',
        createdAt: daysAgo(4),
        items: {
          create: [
            { productId: products[0].id, quantity: 1, unitPrice: 850,  lineTotal: 850  },
            { productId: products[8].id, quantity: 2, unitPrice: 450,  lineTotal: 900  },
          ],
        },
      },
    }),
    prisma.posOrder.create({
      data: {
        brandId: brand.id,
        orderNumber: 'POS-20250315-002',
        eventId: bazaarEvent.id,
        totalAmount: 1100,
        discountAmount: 100,
        finalAmount: 1000,
        paymentMethod: 'instapay',
        createdAt: daysAgo(4),
        items: {
          create: [
            { productId: products[6].id, quantity: 1, unitPrice: 1100, lineTotal: 1100 },
          ],
        },
      },
    }),
    prisma.posOrder.create({
      data: {
        brandId: brand.id,
        orderNumber: 'POS-20250316-001',
        eventId: bazaarEvent.id,
        totalAmount: 3050,
        discountAmount: 200,
        finalAmount: 2850,
        paymentMethod: 'card',
        createdAt: daysAgo(3),
        items: {
          create: [
            { productId: products[0].id, quantity: 1, unitPrice: 850,  lineTotal: 850  },
            { productId: products[3].id, quantity: 1, unitPrice: 850,  lineTotal: 850  },
            { productId: products[9].id, quantity: 1, unitPrice: 1350, lineTotal: 1350 },
          ],
        },
      },
    }),
    prisma.posOrder.create({
      data: {
        brandId: brand.id,
        orderNumber: 'POS-20250316-002',
        totalAmount: 900,
        discountAmount: 0,
        finalAmount: 900,
        paymentMethod: 'cash',
        createdAt: daysAgo(3),
        items: {
          create: [
            { productId: products[8].id, quantity: 2, unitPrice: 450, lineTotal: 900 },
          ],
        },
      },
    }),
    prisma.posOrder.create({
      data: {
        brandId: brand.id,
        orderNumber: 'POS-20250317-001',
        eventId: bazaarEvent.id,
        totalAmount: 2400,
        discountAmount: 0,
        finalAmount: 2400,
        paymentMethod: 'instapay',
        createdAt: daysAgo(2),
        items: {
          create: [
            { productId: products[3].id, quantity: 1, unitPrice: 850,  lineTotal: 850  },
            { productId: products[8].id, quantity: 1, unitPrice: 450,  lineTotal: 450  },
            { productId: products[6].id, quantity: 1, unitPrice: 1100, lineTotal: 1100 },
          ],
        },
      },
    }),
  ])

  // ─── 8. Expenses (12) ────────────────────────────────────────────────────────
  const now        = new Date()
  const thisMonth  = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonths  = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const d = (base: Date, offsetDays: number) =>
    new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    // production (3)
    prisma.expense.create({ data: { brandId: brand.id, category: 'production', amount: 28500, source: 'manual',       notes: 'تكلفة إنتاج مجموعة كتان صيف 2025',    date: twoMonths,    isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'production', amount: 18000, source: 'manual',       notes: 'تكلفة إنتاج مجموعة بيسيكس 2025',      date: d(twoMonths, 10),  isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'production', amount: 9500,  source: 'manual',       notes: 'خامات إضافية وأقمشة',                  date: d(lastMonth, 5),   isRecurring: false } }),
    // packaging (2)
    prisma.expense.create({ data: { brandId: brand.id, category: 'packaging',  amount: 2200,  source: 'manual',       notes: 'أكياس حرارية وكراتين تغليف',           date: d(lastMonth, 3),   isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'packaging',  amount: 1400,  source: 'manual',       notes: 'أوراق تيشو وستيكرات الماركة',          date: d(thisMonth, 2),   isRecurring: false } }),
    // shipping / auto_courier (2)
    prisma.expense.create({ data: { brandId: brand.id, category: 'shipping',   amount: 1650,  source: 'auto_courier', notes: 'رسوم شحن أرامكس - فبراير',             date: d(lastMonth, 28),  isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'shipping',   amount: 1920,  source: 'auto_courier', notes: 'رسوم شحن بوسطة - مارس',               date: d(thisMonth, 7),   isRecurring: false } }),
    // ads / auto_windsor (3)
    prisma.expense.create({ data: { brandId: brand.id, category: 'ads',        amount: 6800,  source: 'auto_windsor', notes: 'Meta Ads - فبراير',                    date: d(lastMonth, 28),  isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'ads',        amount: 3400,  source: 'auto_windsor', notes: 'TikTok Ads - فبراير',                  date: d(lastMonth, 28),  isRecurring: false } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'ads',        amount: 7200,  source: 'auto_windsor', notes: 'Meta Ads - مارس',                      date: d(thisMonth, 5),   isRecurring: false } }),
    // salary (1)
    prisma.expense.create({ data: { brandId: brand.id, category: 'salary',     amount: 25000, source: 'manual',       notes: 'رواتب الفريق - مارس 2025',             date: thisMonth,         isRecurring: true  } }),
    // rent (1)
    prisma.expense.create({ data: { brandId: brand.id, category: 'rent',       amount: 8000,  source: 'manual',       notes: 'إيجار المخزن والمكتب - مارس 2025',    date: thisMonth,         isRecurring: true  } }),
  ])

  // ─── 9. OverheadSettings ─────────────────────────────────────────────────────
  await prisma.overheadSettings.upsert({
    where: { brandId: brand.id },
    update: { monthlyRent: 8000, monthlySalaries: 25000, otherMonthly: 3000, avgShippingCost: 55 },
    create: { brandId: brand.id, monthlyRent: 8000, monthlySalaries: 25000, otherMonthly: 3000, avgShippingCost: 55 },
  })

  // ─── 10. MarketingSnapshots (15) ─────────────────────────────────────────────
  // 5 Meta campaigns + 3 TikTok campaigns across 30 days
  await prisma.$transaction([
    // MC-001  Summer Collection - Broad  (3 snapshots)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(1),  platform: 'meta',   campaignId: 'MC-001', campaignName: 'Summer Collection - Broad',        spend: 1200, revenue: 5200,  roas: 4.33, impressions: 48000, clicks: 1800, orders: 14, cpm: 25.00, cpc: 6.67, ctr: 3.75 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(7),  platform: 'meta',   campaignId: 'MC-001', campaignName: 'Summer Collection - Broad',        spend: 980,  revenue: 3920,  roas: 4.00, impressions: 41000, clicks: 1540, orders: 11, cpm: 23.90, cpc: 6.36, ctr: 3.76 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(14), platform: 'meta',   campaignId: 'MC-001', campaignName: 'Summer Collection - Broad',        spend: 850,  revenue: 3230,  roas: 3.80, impressions: 35000, clicks: 1260, orders:  9, cpm: 24.29, cpc: 6.75, ctr: 3.60 } }),
    // MC-002  Retargeting - Cart Abandoners  (3 snapshots)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(2),  platform: 'meta',   campaignId: 'MC-002', campaignName: 'Retargeting - Cart Abandoners',    spend: 420,  revenue: 1890,  roas: 4.50, impressions:  9800, clicks:  540, orders:  7, cpm: 42.86, cpc: 7.78, ctr: 5.51 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(10), platform: 'meta',   campaignId: 'MC-002', campaignName: 'Retargeting - Cart Abandoners',    spend: 380,  revenue: 1520,  roas: 4.00, impressions:  8400, clicks:  460, orders:  6, cpm: 45.24, cpc: 8.26, ctr: 5.48 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(18), platform: 'meta',   campaignId: 'MC-002', campaignName: 'Retargeting - Cart Abandoners',    spend: 340,  revenue: 1088,  roas: 3.20, impressions:  7600, clicks:  420, orders:  5, cpm: 44.74, cpc: 8.10, ctr: 5.53 } }),
    // MC-003  Linen Pants - Lookalike  (2 snapshots)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(5),  platform: 'meta',   campaignId: 'MC-003', campaignName: 'Linen Pants - Lookalike Audience', spend: 660,  revenue: 2310,  roas: 3.50, impressions: 28000, clicks:  980, orders:  8, cpm: 23.57, cpc: 6.73, ctr: 3.50 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(15), platform: 'meta',   campaignId: 'MC-003', campaignName: 'Linen Pants - Lookalike Audience', spend: 520,  revenue: 1560,  roas: 3.00, impressions: 22000, clicks:  780, orders:  5, cpm: 23.64, cpc: 6.67, ctr: 3.55 } }),
    // MC-004  Winter Clearance  (1 snapshot)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(20), platform: 'meta',   campaignId: 'MC-004', campaignName: 'Winter Clearance Sale',             spend: 320,  revenue: 1120,  roas: 3.50, impressions: 15000, clicks:  520, orders:  4, cpm: 21.33, cpc: 6.15, ctr: 3.47 } }),
    // MC-005  Basics Remarketing  (1 snapshot)  — low performer
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(25), platform: 'meta',   campaignId: 'MC-005', campaignName: 'Basics 2025 - Remarketing',         spend: 200,  revenue:  500,  roas: 2.50, impressions:  5000, clicks:  100, orders:  2, cpm: 40.00, cpc: 2.00, ctr: 2.00 } }),
    // TC-001  Eagle Summer - TopView Spark  (2 snapshots) — below breakeven
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(4),  platform: 'tiktok', campaignId: 'TC-001', campaignName: 'Eagle Summer - TopView Spark',      spend: 1800, revenue: 2700,  roas: 1.50, impressions: 50000, clicks: 2000, orders:  6, cpm: 36.00, cpc: 9.00, ctr: 4.00 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(9),  platform: 'tiktok', campaignId: 'TC-001', campaignName: 'Eagle Summer - TopView Spark',      spend: 1400, revenue: 2520,  roas: 1.80, impressions: 42000, clicks: 1680, orders:  5, cpm: 33.33, cpc: 8.33, ctr: 4.00 } }),
    // TC-002  Basics In-Feed Video  (1 snapshot)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(14), platform: 'tiktok', campaignId: 'TC-002', campaignName: 'Basics TikTok - In-Feed Video',     spend: 750,  revenue: 3000,  roas: 4.00, impressions: 38000, clicks: 1520, orders: 12, cpm: 19.74, cpc: 4.93, ctr: 4.00 } }),
    // TC-003  Hoodie Hashtag Challenge  (1 snapshot)
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(22), platform: 'tiktok', campaignId: 'TC-003', campaignName: 'Hoodie Winter - Hashtag Challenge', spend: 2200, revenue: 9900,  roas: 4.50, impressions: 48000, clicks: 1920, orders: 30, cpm: 45.83, cpc: 11.46, ctr: 4.00 } }),
    // MC-001  extra snapshot day 12
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: daysAgo(12), platform: 'meta',   campaignId: 'MC-001', campaignName: 'Summer Collection - Broad',        spend: 760,  revenue: 2660,  roas: 3.50, impressions: 32000, clicks: 1120, orders:  8, cpm: 23.75, cpc: 6.79, ctr: 3.50 } }),
  ])

  // ─── 11. AiInsights (8) ──────────────────────────────────────────────────────
  await prisma.$transaction([
    // CRITICAL — inventory: hoodie stockout
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'inventory',
        severity: 'critical',
        titleEn: 'Gray Hoodie L approaching stockout',
        titleAr: 'هوديه رمادي L على وشك النفاد',
        bodyEn: 'EF-HO-GR-L has only 8 units remaining (5 warehouse, 2 Shopify, 1 physical). At current sales velocity of 3 units/day, stock will deplete within 2–3 days. Place an emergency reorder of at least 50 units immediately.',
        bodyAr: 'الكود EF-HO-GR-L لديه 8 وحدات فقط متبقية (5 مخزن، 2 شوبيفاي، 1 فيزيائي). بمعدل المبيعات الحالي 3 وحدات/يوم، سينفد المخزون خلال 2–3 أيام. أصدر أمر شراء عاجل بـ 50 وحدة على الأقل فوراً.',
        isRead: false,
      },
    }),
    // WARNING — finance: COD rate
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'finance',
        severity: 'warning',
        titleEn: 'COD collection rate below 60% this month',
        titleAr: 'معدل تحصيل الدفع عند الاستلام أقل من 60% هذا الشهر',
        bodyEn: 'Only 58% of COD orders this month have been successfully collected. Two failed deliveries (BST-2025-20046, BST-2025-20049) represent EGP 2,450 in uncollected revenue. Follow up with couriers or offer re-delivery incentives to recover.',
        bodyAr: '58% فقط من طلبات الدفع عند الاستلام هذا الشهر تم تحصيلها. توصيلتان فاشلتان تمثلان 2,450 جنيه غير محصّلة. تابع مع شركات الشحن أو قدم حوافز لإعادة التوصيل.',
        isRead: false,
      },
    }),
    // WARNING — marketing: TikTok ROAS
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'marketing',
        severity: 'warning',
        titleEn: 'TikTok ROAS below breakeven threshold',
        titleAr: 'عائد إعلانات تيك توك أقل من نقطة التعادل',
        bodyEn: 'Campaign TC-001 (Eagle Summer - TopView Spark) achieved only 1.5x ROAS vs. your breakeven of 2.6x. You are losing EGP 220 for every EGP 1,000 spent. Consider pausing and A/B testing new creatives, or reallocating budget to the Meta retargeting campaign which is at 4.5x.',
        bodyAr: 'حملة TC-001 حققت 1.5x ROAS فقط مقابل نقطة التعادل 2.6x. تخسر 220 جنيه لكل 1,000 جنيه منفق. فكر في إيقافها واختبار إبداعات جديدة، أو أعد توجيه الميزانية لحملة الريتارجيتينج على ميتا التي تحقق 4.5x.',
        isRead: false,
      },
    }),
    // WARNING — operations: Alexandria failures
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'operations',
        severity: 'warning',
        titleEn: '3 failed deliveries to Alexandria this week',
        titleAr: '3 توصيلات فاشلة لمدينة الإسكندرية هذا الأسبوع',
        bodyEn: 'Three consecutive delivery failures to Alexandria customers (ARX-2025-10025, BST-2025-20049, BST-2025-20046) suggest a regional courier issue. Consider switching courier for Alexandria shipments, or proactively calling customers to confirm addresses before dispatch.',
        bodyAr: 'ثلاث توصيلات فاشلة متتالية لعملاء الإسكندرية تشير إلى مشكلة إقليمية مع الشركة. فكر في تغيير الشركة للشحنات المتجهة لإسكندرية، أو تواصل مع العملاء مسبقاً للتحقق من العناوين.',
        isRead: false,
      },
    }),
    // INFO — inventory: top seller
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'inventory',
        severity: 'info',
        titleEn: 'Black tee XL is your top seller this month',
        titleAr: 'تيشيرت أسود M هو الأكثر مبيعاً هذا الشهر',
        bodyEn: 'EF-BT-BK-M (Black Cotton Tee M) recorded 8 units sold in the last 30 days, making it your highest-velocity product. Current stock of 92 units is sufficient for ~35 days at this rate. Consider featuring it prominently in Meta ads to capitalise on demand.',
        bodyAr: 'EF-BT-BK-M سجّل 8 وحدات مباعة في آخر 30 يوماً، مما يجعله منتجك الأعلى تداولاً. المخزون الحالي 92 وحدة يكفي ~35 يوماً بهذا المعدل. فكر في إبرازه في إعلانات ميتا للاستفادة من الطلب.',
        isRead: false,
      },
    }),
    // INFO — marketing: Meta retargeting improvement
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'marketing',
        severity: 'info',
        titleEn: 'Meta retargeting ROAS improved 25% week-over-week',
        titleAr: 'عائد حملات الريتارجيتينج على ميتا تحسّن 25% أسبوعياً',
        bodyEn: 'Campaign MC-002 (Retargeting - Cart Abandoners) improved from 3.2x to 4.5x ROAS week-over-week (+25%). This aligns with the creative refresh done 10 days ago. Recommend increasing the daily budget by 20–30% to scale this performance while it holds.',
        bodyAr: 'حملة MC-002 تحسّنت من 3.2x إلى 4.5x ROAS أسبوعياً (+25%). يتزامن هذا مع تحديث الإبداعات قبل 10 أيام. يُنصح بزيادة الميزانية اليومية 20–30% لتوسيع نطاق هذا الأداء.',
        isRead: true,
      },
    }),
    // CRITICAL — inventory: Linen pants 32 OOS on Shopify
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'inventory',
        severity: 'critical',
        titleEn: 'Linen pants 32 out of stock on Shopify',
        titleAr: 'بنطلون كتان كريمي مقاس 32 نافذ من شوبيفاي',
        bodyEn: 'EF-LP-CR-32 shows 0 units on Shopify while 18 units sit in the warehouse. This means you are missing online sales opportunities. Update Shopify inventory immediately to push warehouse stock online and capture demand.',
        bodyAr: 'EF-LP-CR-32 يُظهر 0 وحدات على شوبيفاي بينما 18 وحدة موجودة في المخزن. هذا يعني ضياع فرص مبيعات إلكترونية. حدّث مخزون شوبيفاي فوراً لإتاحة مخزون المستودع على الإنترنت.',
        isRead: false,
      },
    }),
    // INFO — finance: POS revenue up
    prisma.aiInsight.create({
      data: {
        brandId: brand.id,
        module: 'finance',
        severity: 'info',
        titleEn: 'POS revenue up 15% this week vs last week',
        titleAr: 'إيرادات نقاط البيع ارتفعت 15% هذا الأسبوع مقارنة بالأسبوع الماضي',
        bodyEn: 'POS sales at the Zamalek Weekend Bazaar generated EGP 5,650 this week vs EGP 4,910 last week (+15%). Instapay and cash were the dominant payment methods. The bazaar channel is proving effective — consider booking additional events for April.',
        bodyAr: 'مبيعات نقاط البيع في بازار زمالك حققت 5,650 جنيه هذا الأسبوع مقابل 4,910 جنيه الأسبوع الماضي (+15%). انستاباي والكاش كانا طرق الدفع السائدة. قناة البازار فعّالة — فكر في حجز فعاليات إضافية لأبريل.',
        isRead: true,
      },
    }),
  ])

  console.log('Seed complete!')
  console.log('─────────────────────────────────────────────────')
  console.log(`Brand    : Eagle Fashion  (id: ${brand.id})`)
  console.log('Login    : admin@brandos.eg  /  pass123')
  console.log('─────────────────────────────────────────────────')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
