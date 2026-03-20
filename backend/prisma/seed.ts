import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Brand OS database...')

  const brand = await prisma.brand.upsert({
    where: { email: 'eagle@brandos.eg' },
    update: {},
    create: { name: 'Eagle Fashion', email: 'eagle@brandos.eg', language: 'ar', currency: 'EGP' },
  })

  const passwordHash = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@brandos.eg' },
    update: {},
    create: { email: 'admin@brandos.eg', passwordHash, name: 'Ahmed Admin', brandId: brand.id, role: 'owner' },
  })

  const products = await Promise.all([
    prisma.product.create({ data: { brandId: brand.id, title: 'قميص كتان أبيض', sku: 'EF-LS-W-M', collection: 'Linen Summer 2025', category: 'shirts', size: 'M', color: 'White', sellingPrice: 850, costPrice: 280, stockWarehouse: 45, stockShopify: 12, stockPhysical: 8, lowStockThreshold: 10 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'قميص كتان أبيض', sku: 'EF-LS-W-L', collection: 'Linen Summer 2025', category: 'shirts', size: 'L', color: 'White', sellingPrice: 850, costPrice: 280, stockWarehouse: 30, stockShopify: 9, stockPhysical: 5, lowStockThreshold: 10 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'قميص كتان بيج', sku: 'EF-LS-B-M', collection: 'Linen Summer 2025', category: 'shirts', size: 'M', color: 'Beige', sellingPrice: 850, costPrice: 290, stockWarehouse: 20, stockShopify: 7, stockPhysical: 4, lowStockThreshold: 10 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'بنطلون كتان كريمي', sku: 'EF-LP-CR-32', collection: 'Linen Summer 2025', category: 'pants', size: '32', color: 'Cream', sellingPrice: 1100, costPrice: 380, stockWarehouse: 18, stockShopify: 4, stockPhysical: 3, lowStockThreshold: 8 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'بنطلون كتان كريمي', sku: 'EF-LP-CR-34', collection: 'Linen Summer 2025', category: 'pants', size: '34', color: 'Cream', sellingPrice: 1100, costPrice: 380, stockWarehouse: 25, stockShopify: 6, stockPhysical: 6, lowStockThreshold: 8 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'تيشيرت قطن بيسك أسود', sku: 'EF-BT-BK-S', collection: 'Basics 2025', category: 'tshirts', size: 'S', color: 'Black', sellingPrice: 450, costPrice: 120, stockWarehouse: 80, stockShopify: 25, stockPhysical: 15, lowStockThreshold: 20 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'تيشيرت قطن بيسك أسود', sku: 'EF-BT-BK-M', collection: 'Basics 2025', category: 'tshirts', size: 'M', color: 'Black', sellingPrice: 450, costPrice: 120, stockWarehouse: 60, stockShopify: 20, stockPhysical: 12, lowStockThreshold: 20 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'هوديه أوفرسايز رمادي', sku: 'EF-HO-GR-L', collection: 'Winter Essentials 2024', category: 'hoodies', size: 'L', color: 'Gray', sellingPrice: 1350, costPrice: 450, stockWarehouse: 5, stockShopify: 2, stockPhysical: 1, lowStockThreshold: 10 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'جاكيت دينم كلاسيك', sku: 'EF-DJ-BL-M', collection: 'Denim Collection 2024', category: 'jackets', size: 'M', color: 'Blue', sellingPrice: 2200, costPrice: 750, stockWarehouse: 0, stockShopify: 0, stockPhysical: 0, lowStockThreshold: 5 } }),
    prisma.product.create({ data: { brandId: brand.id, title: 'شورت رياضي أزرق', sku: 'EF-SS-BL-L', collection: 'Activewear 2025', category: 'shorts', size: 'L', color: 'Blue', sellingPrice: 380, costPrice: 110, stockWarehouse: 35, stockShopify: 15, stockPhysical: 0, lowStockThreshold: 15 } }),
  ])

  const orders = await Promise.all([
    prisma.order.create({ data: { brandId: brand.id, source: 'shopify', status: 'fulfilled', totalAmount: 1700, paymentMethod: 'cod', customerName: 'محمد علي', customerPhone: '01012345678', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[0].id, quantity: 1, unitPrice: 850 }, { productId: products[3].id, quantity: 1, unitPrice: 850 }] } } }),
    prisma.order.create({ data: { brandId: brand.id, source: 'shopify', status: 'fulfilled', totalAmount: 900, paymentMethod: 'online', customerName: 'فاطمة أحمد', customerPhone: '01098765432', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[5].id, quantity: 2, unitPrice: 450 }] } } }),
    prisma.order.create({ data: { brandId: brand.id, source: 'shopify', status: 'processing', totalAmount: 2200, paymentMethod: 'cod', customerName: 'عمر حسن', customerPhone: '01155667788', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[8].id, quantity: 1, unitPrice: 2200 }] } } }),
    prisma.order.create({ data: { brandId: brand.id, source: 'shopify', status: 'fulfilled', totalAmount: 1350, paymentMethod: 'cod', customerName: 'سارة محمود', customerPhone: '01234567890', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[7].id, quantity: 1, unitPrice: 1350 }] } } }),
    prisma.order.create({ data: { brandId: brand.id, source: 'tiktok_shop', status: 'fulfilled', totalAmount: 1300, paymentMethod: 'online', customerName: 'ياسمين خالد', customerPhone: '01122334455', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[1].id, quantity: 1, unitPrice: 850 }, { productId: products[9].id, quantity: 1, unitPrice: 380 }] } } }),
  ])

  await Promise.all([
    prisma.shipment.create({ data: { brandId: brand.id, orderId: orders[0].id, courier: 'aramex', trackingNumber: 'ARX-2025-001', status: 'in_transit', codAmount: 1700, codStatus: 'pending', shippingCost: 75, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } }),
    prisma.shipment.create({ data: { brandId: brand.id, orderId: orders[1].id, courier: 'bosta', trackingNumber: 'BST-2025-002', status: 'delivered', codAmount: 0, codStatus: 'not_applicable', shippingCost: 60 } }),
    prisma.shipment.create({ data: { brandId: brand.id, orderId: orders[2].id, courier: 'aramex', trackingNumber: 'ARX-2025-003', status: 'created', codAmount: 2200, codStatus: 'pending', shippingCost: 80 } }),
    prisma.shipment.create({ data: { brandId: brand.id, orderId: orders[3].id, courier: 'bosta', trackingNumber: 'BST-2025-004', status: 'failed', codAmount: 1350, codStatus: 'pending', shippingCost: 60, createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) } }),
    prisma.shipment.create({ data: { brandId: brand.id, orderId: orders[4].id, courier: 'aramex', trackingNumber: 'ARX-2025-005', status: 'delivered', codAmount: 0, codStatus: 'not_applicable', shippingCost: 75 } }),
  ])

  const bazaarEvent = await prisma.bazaarEvent.create({
    data: {
      brandId: brand.id,
      name: 'معرض الموضة الربيعي - القاهرة',
      location: 'سيتي ستارز، القاهرة',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'active',
      inventory: {
        create: [
          { productId: products[0].id, allocated: 10, sold: 4 },
          { productId: products[2].id, allocated: 8, sold: 3 },
          { productId: products[5].id, allocated: 20, sold: 12 },
        ],
      },
    },
  })

  await Promise.all([
    prisma.posOrder.create({ data: { brandId: brand.id, orderNumber: 'POS-20250315-001', eventId: bazaarEvent.id, totalAmount: 1700, discountAmount: 0, finalAmount: 1700, paymentMethod: 'cash', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[0].id, quantity: 1, unitPrice: 850, lineTotal: 850 }, { productId: products[5].id, quantity: 2, unitPrice: 450, lineTotal: 900 }] } } }),
    prisma.posOrder.create({ data: { brandId: brand.id, orderNumber: 'POS-20250316-001', eventId: bazaarEvent.id, totalAmount: 1100, discountAmount: 100, finalAmount: 1000, paymentMethod: 'instapay', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), items: { create: [{ productId: products[3].id, quantity: 1, unitPrice: 1100, lineTotal: 1100 }] } } }),
    prisma.posOrder.create({ data: { brandId: brand.id, orderNumber: 'POS-20250316-002', totalAmount: 850, discountAmount: 0, finalAmount: 850, paymentMethod: 'card', items: { create: [{ productId: products[2].id, quantity: 1, unitPrice: 850, lineTotal: 850 }] } } }),
  ])

  const now = new Date()
  const expenseBase = new Date(now.getFullYear(), now.getMonth(), 1)

  await Promise.all([
    prisma.expense.create({ data: { brandId: brand.id, category: 'rent', amount: 8000, source: 'manual', notes: 'إيجار المخزن الشهري', date: expenseBase, isRecurring: true } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'salary', amount: 15000, source: 'manual', notes: 'رواتب الموظفين', date: expenseBase, isRecurring: true } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'ads', amount: 5500, source: 'auto_windsor', notes: 'Meta Ads - March', date: new Date(expenseBase.getTime() + 5 * 24 * 60 * 60 * 1000) } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'ads', amount: 3200, source: 'auto_windsor', notes: 'TikTok Ads - March', date: new Date(expenseBase.getTime() + 5 * 24 * 60 * 60 * 1000) } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'packaging', amount: 1200, source: 'manual', notes: 'أكياس وكراتين التغليف', date: new Date(expenseBase.getTime() + 3 * 24 * 60 * 60 * 1000) } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'shipping', amount: 890, source: 'auto_courier', notes: 'رسوم شحن أرامكس - مارس', date: new Date(expenseBase.getTime() + 7 * 24 * 60 * 60 * 1000) } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'production', amount: 22000, source: 'manual', notes: 'تكلفة إنتاج مجموعة الصيف', date: new Date(expenseBase.getTime() + 1 * 24 * 60 * 60 * 1000) } }),
    prisma.expense.create({ data: { brandId: brand.id, category: 'other', amount: 500, source: 'manual', notes: 'مستلزمات مكتبية', date: new Date(expenseBase.getTime() + 4 * 24 * 60 * 60 * 1000) } }),
  ])

  await prisma.overheadSettings.upsert({
    where: { brandId: brand.id },
    update: {},
    create: { brandId: brand.id, monthlyRent: 8000, monthlySalaries: 15000, otherMonthly: 2000, avgShippingCost: 70 },
  })

  await Promise.all([
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), platform: 'meta', campaignId: 'MC-001', campaignName: 'Summer Linen - TOF', spend: 850, revenue: 3200, roas: 3.76, impressions: 45000, clicks: 1200, orders: 8, cpm: 18.89, cpc: 0.71, ctr: 2.67 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), platform: 'tiktok', campaignId: 'TC-001', campaignName: 'Eagle Basics - Spark', spend: 420, revenue: 980, roas: 2.33, impressions: 72000, clicks: 2100, orders: 4, cpm: 5.83, cpc: 0.20, ctr: 2.92 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), platform: 'meta', campaignId: 'MC-001', campaignName: 'Summer Linen - TOF', spend: 920, revenue: 4100, roas: 4.46, impressions: 48000, clicks: 1350, orders: 11, cpm: 19.17, cpc: 0.68, ctr: 2.81 } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), platform: 'meta', campaignId: 'MC-002', campaignName: 'Denim Retarget', adId: 'AD-001', spend: 340, revenue: 660, roas: 1.94, impressions: 18000, clicks: 420, orders: 2, cpm: 18.89, cpc: 0.81, ctr: 2.33, creativeUrl: 'https://example.com/creative1.jpg' } }),
    prisma.marketingSnapshot.create({ data: { brandId: brand.id, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), platform: 'combined', campaignId: 'COMBINED', spend: 1800, revenue: 5200, roas: 2.89, impressions: 125000, clicks: 3800, orders: 18, cpm: 14.40, cpc: 0.47, ctr: 3.04 } }),
  ])

  await Promise.all([
    prisma.aiInsight.create({ data: { brandId: brand.id, module: 'inventory', severity: 'warning', titleEn: 'Hoodie stock critically low across all locations', titleAr: 'مخزون الهودي منخفض جداً في جميع المواقع', bodyEn: 'EF-HO-GR-L has only 8 units remaining (5 warehouse, 2 Shopify, 1 physical). At current velocity of 3 units/day, you will stock out in 2-3 days. Reorder minimum 50 units immediately.', bodyAr: 'الكود EF-HO-GR-L لديه 8 وحدات فقط متبقية. بمعدل المبيعات الحالي 3 وحدات/يوم، ستنفد خلال 2-3 أيام. اطلب 50 وحدة على الأقل فوراً.' } }),
    prisma.aiInsight.create({ data: { brandId: brand.id, module: 'finance', severity: 'critical', titleEn: 'COD payment overdue 16 days - BST-2025-004', titleAr: 'دفعة الدفع عند الاستلام متأخرة 16 يوماً', bodyEn: 'Order for سارة محمود (BST-2025-004) has EGP 1,350 COD pending for 16 days with failed delivery status. This requires immediate escalation to Bosta support to recover the shipment or arrange re-delivery.', bodyAr: 'طلب سارة محمود (BST-2025-004) لديه 1,350 جنيه معلقة منذ 16 يوماً مع حالة توصيل فاشل. يتطلب تصعيداً فورياً لدعم بوسطة لاسترداد الشحنة.' } }),
    prisma.aiInsight.create({ data: { brandId: brand.id, module: 'marketing', severity: 'warning', titleEn: 'TikTok ROAS below breakeven threshold', titleAr: 'عائد إعلانات تيك توك أقل من نقطة التعادل', bodyEn: 'TikTok campaign TC-001 achieved ROAS of 2.33x vs your breakeven of 2.6x. You are losing EGP 116 for every 1,000 EGP spent. Consider pausing and testing new creatives or reallocating budget to Meta.', bodyAr: 'حملة تيك توك TC-001 حققت 2.33x مقابل نقطة التعادل 2.6x. تخسر 116 جنيه لكل 1,000 جنيه منفق. فكر في إيقافها واختبار إبداعات جديدة.' } }),
    prisma.aiInsight.create({ data: { brandId: brand.id, module: 'operations', severity: 'info', titleEn: 'Denim jacket out of stock - restock needed', titleAr: 'جاكيت الدنيم نافذ من المخزون', bodyEn: 'EF-DJ-BL-M has 0 units across all locations. This product had 4 sales in the last 30 days. Consider restocking 20-30 units to capture demand, especially ahead of the bazaar season.', bodyAr: 'EF-DJ-BL-M لديه 0 وحدة في جميع المواقع. هذا المنتج حقق 4 مبيعات في آخر 30 يوماً. فكر في إعادة تخزين 20-30 وحدة.' } }),
    prisma.aiInsight.create({ data: { brandId: brand.id, module: 'finance', severity: 'info', titleEn: 'Ad spend up 18% vs last week', titleAr: 'الإنفاق الإعلاني ارتفع 18% مقارنة بالأسبوع الماضي', bodyEn: 'Total ad spend this week is EGP 8,700 vs EGP 7,380 last week (+18%). Revenue increased 22% in the same period, indicating positive ROI on the additional spend. Monitor closely to ensure ROAS stays above 2.6x.', bodyAr: 'إجمالي الإنفاق الإعلاني هذا الأسبوع 8,700 جنيه مقابل 7,380 الأسبوع الماضي (+18%). الإيرادات ارتفعت 22%، مما يشير إلى عائد إيجابي على الإنفاق الإضافي.' } }),
  ])

  console.log('Seed complete!')
  console.log(`Brand: Eagle Fashion (${brand.id})`)
  console.log('Login: admin@brandos.eg / Admin123!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
