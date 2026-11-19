// Fictional sample data for the demo. Store names, numbers and conversations are invented.
// "Unofficial concept prototype" — not affiliated with any real marketplace.

export const DEFAULT_LEDGER = [
  // معرض البغدادي للأجهزة — Home Appliances
  { id: 'tx-1', store_name: 'معرض البغدادي للأجهزة', category: 'الأجهزة المنزلية', city: 'بغداد', order_date: '2026-11-02', units_sold: 145, buy_cost_iqd: 152000, sell_price_iqd: 215000, status: 'delivered', delivery_hours: 20, customer_segment: 'المتقاعدون', payment_method: 'تقسيط' },
  { id: 'tx-2', store_name: 'معرض البغدادي للأجهزة', category: 'الأجهزة المنزلية', city: 'بغداد', order_date: '2026-11-05', units_sold: 110, buy_cost_iqd: 148000, sell_price_iqd: 205000, status: 'delivered', delivery_hours: 22, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },
  { id: 'tx-3', store_name: 'معرض البغدادي للأجهزة', category: 'الأجهزة المنزلية', city: 'بغداد', order_date: '2026-11-15', units_sold: 68, buy_cost_iqd: 140000, sell_price_iqd: 195000, status: 'delivered', delivery_hours: 26, customer_segment: 'المتقاعدون', payment_method: 'تقسيط' },
  { id: 'tx-4', store_name: 'معرض البغدادي للأجهزة', category: 'الأجهزة المنزلية', city: 'بغداد', order_date: '2026-11-18', units_sold: 10, buy_cost_iqd: 145000, sell_price_iqd: 200000, status: 'returned', delivery_hours: 34, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },

  // تكنو كرادة ستور — Electronics
  { id: 'tx-5', store_name: 'تكنو كرادة ستور', category: 'الإلكترونيات', city: 'بغداد', order_date: '2026-11-03', units_sold: 220, buy_cost_iqd: 102000, sell_price_iqd: 138000, status: 'delivered', delivery_hours: 14, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },
  { id: 'tx-6', store_name: 'تكنو كرادة ستور', category: 'الإلكترونيات', city: 'بغداد', order_date: '2026-11-07', units_sold: 130, buy_cost_iqd: 88000, sell_price_iqd: 120000, status: 'delivered', delivery_hours: 16, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-7', store_name: 'تكنو كرادة ستور', category: 'الإلكترونيات', city: 'بغداد', order_date: '2026-11-16', units_sold: 165, buy_cost_iqd: 44000, sell_price_iqd: 62000, status: 'delivered', delivery_hours: 18, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-8', store_name: 'تكنو كرادة ستور', category: 'الإلكترونيات', city: 'بغداد', order_date: '2026-11-19', units_sold: 18, buy_cost_iqd: 95000, sell_price_iqd: 130000, status: 'returned', delivery_hours: 22, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },

  // بيت العود والعطور — Perfumes & Beauty
  { id: 'tx-9', store_name: 'بيت العود والعطور', category: 'العطور والتجميل', city: 'البصرة', order_date: '2026-11-04', units_sold: 195, buy_cost_iqd: 38000, sell_price_iqd: 68000, status: 'delivered', delivery_hours: 18, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },
  { id: 'tx-10', store_name: 'بيت العود والعطور', category: 'العطور والتجميل', city: 'البصرة', order_date: '2026-11-14', units_sold: 170, buy_cost_iqd: 34000, sell_price_iqd: 60000, status: 'delivered', delivery_hours: 20, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-11', store_name: 'بيت العود والعطور', category: 'العطور والتجميل', city: 'البصرة', order_date: '2026-11-20', units_sold: 115, buy_cost_iqd: 31000, sell_price_iqd: 55000, status: 'delivered', delivery_hours: 22, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-12', store_name: 'بيت العود والعطور', category: 'العطور والتجميل', city: 'البصرة', order_date: '2026-11-21', units_sold: 11, buy_cost_iqd: 35000, sell_price_iqd: 62000, status: 'returned', delivery_hours: 26, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },

  // أزياء دجلة الحديثة — Fashion (higher returns to show actionable health diagnostics)
  { id: 'tx-13', store_name: 'أزياء دجلة الحديثة', category: 'الأزياء', city: 'بغداد', order_date: '2026-11-06', units_sold: 140, buy_cost_iqd: 31000, sell_price_iqd: 52000, status: 'delivered', delivery_hours: 36, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-14', store_name: 'أزياء دجلة الحديثة', category: 'الأزياء', city: 'بغداد', order_date: '2026-11-17', units_sold: 185, buy_cost_iqd: 28000, sell_price_iqd: 47000, status: 'delivered', delivery_hours: 40, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-15', store_name: 'أزياء دجلة الحديثة', category: 'الأزياء', city: 'بغداد', order_date: '2026-11-22', units_sold: 46, buy_cost_iqd: 29000, sell_price_iqd: 49000, status: 'returned', delivery_hours: 48, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },

  // دار الرافدين للمنزل — Home Appliances (Erbil)
  { id: 'tx-16', store_name: 'دار الرافدين للمنزل', category: 'الأجهزة المنزلية', city: 'أربيل', order_date: '2026-11-03', units_sold: 115, buy_cost_iqd: 132000, sell_price_iqd: 185000, status: 'delivered', delivery_hours: 28, customer_segment: 'المتقاعدون', payment_method: 'تقسيط' },
  { id: 'tx-17', store_name: 'دار الرافدين للمنزل', category: 'الأجهزة المنزلية', city: 'أربيل', order_date: '2026-11-16', units_sold: 75, buy_cost_iqd: 126000, sell_price_iqd: 175000, status: 'delivered', delivery_hours: 32, customer_segment: 'المتقاعدون', payment_method: 'تقسيط' },
  { id: 'tx-18', store_name: 'دار الرافدين للمنزل', category: 'الأجهزة المنزلية', city: 'أربيل', order_date: '2026-11-19', units_sold: 9, buy_cost_iqd: 130000, sell_price_iqd: 180000, status: 'returned', delivery_hours: 38, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },

  // لمسة بيوتي — المنصور
  { id: 'tx-19', store_name: 'لمسة بيوتي — المنصور', category: 'العطور والتجميل', city: 'بغداد', order_date: '2026-11-05', units_sold: 210, buy_cost_iqd: 30000, sell_price_iqd: 58000, status: 'delivered', delivery_hours: 14, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },
  { id: 'tx-20', store_name: 'لمسة بيوتي — المنصور', category: 'العطور والتجميل', city: 'بغداد', order_date: '2026-11-15', units_sold: 195, buy_cost_iqd: 29000, sell_price_iqd: 54000, status: 'delivered', delivery_hours: 16, customer_segment: 'الشباب والعمال', payment_method: 'دفع عند الاستلام' },
  { id: 'tx-21', store_name: 'لمسة بيوتي — المنصور', category: 'العطور والتجميل', city: 'بغداد', order_date: '2026-11-21', units_sold: 12, buy_cost_iqd: 30000, sell_price_iqd: 56000, status: 'returned', delivery_hours: 18, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },
];

export const DEFAULT_OFFERS = [
  {
    id: 'off-1',
    storeName: 'معرض البغدادي للأجهزة',
    totalDiscountPct: 14,
    merchantSharePct: 45,
    platformSharePct: 55,
    fundingSource: 'bnpl',
    multiplier: 1.9,
    projectedExtraUnits: 0, // recalculated from the real engine when the demo is seeded
    projectedMerchantProfitDelta: 0,
    note: 'عرض مقترح لأيام نزول رواتب المتقاعدين مع تفعيل التقسيط.',
    status: 'pending', // 'pending' | 'accepted' | 'countered'
    createdAt: 'اليوم، 09:05 ص',
  },
];

export const DEFAULT_MESSAGES = [
  {
    id: 'msg-1',
    storeName: 'معرض البغدادي للأجهزة',
    sender: 'admin',
    text: 'مرحباً فريق معرض البغدادي، أرسلنا لكم عرض خصم مشترك 14% لحملة بداية الشهر بتمويل 55% من المنصة عبر التقسيط.',
    time: '09:05 ص',
    readByMerchant: false,
    readByAdmin: true,
  },
  {
    id: 'msg-2',
    storeName: 'أزياء دجلة الحديثة',
    sender: 'merchant',
    text: 'مرحباً إدارة المنصة، نحتاج مساعدة لتقليل المرتجعات في قسم المقاسات وتفعيل عرض تنشيط منتصف الشهر.',
    time: '08:40 ص',
    readByMerchant: true,
    readByAdmin: false,
  },
];

export const DEFAULT_TASKS = [
  {
    id: 'tk-1',
    title: 'متابعة موافقة عرض الأجهزة المنزلية مع معرض البغدادي',
    storeName: 'معرض البغدادي للأجهزة',
    priority: 'urgent',
    done: false,
  },
  {
    id: 'tk-2',
    title: 'مراجعة أسباب الإرجاع (12.4%) وتحديث المقاسات',
    storeName: 'أزياء دجلة الحديثة',
    priority: 'urgent',
    done: false,
  },
];
