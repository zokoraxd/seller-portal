// Sample files for the import screen. Fictional data.

/** A clean template the user can download, fill in and upload. */
export function templateRows(storeName = 'معرض النور للأجهزة') {
  const base = { store_name: storeName, category: 'الأجهزة المنزلية', city: 'بغداد' }
  return [
    { ...base, order_date: '2026-11-04', units_sold: 45, buy_cost_iqd: 145000, sell_price_iqd: 210000, status: 'مكتمل', delivery_hours: 18, customer_segment: 'المتقاعدون', payment_method: 'تقسيط' },
    { ...base, order_date: '2026-11-16', units_sold: 32, buy_cost_iqd: 138000, sell_price_iqd: 195000, status: 'مكتمل', delivery_hours: 22, customer_segment: 'الموظفون', payment_method: 'بطاقة مصرفية' },
    { ...base, order_date: '2026-11-18', units_sold: 3, buy_cost_iqd: 140000, sell_price_iqd: 198000, status: 'مرتجع', delivery_hours: 30, customer_segment: 'الموظفون', payment_method: 'دفع عند الاستلام' },
  ]
}

// Excel stores 2026-11-12 as this number when the cell is formatted as a date.
const EXCEL_SERIAL_2026_11_12 = Date.UTC(2026, 10, 12) / 86_400_000 + 25569

/**
 * A deliberately messy sheet, the way real shops send data: Arabic headers and digits,
 * "145 الف", Excel date numbers, unknown categories, a duplicate, a zero quantity...
 * Used by the "try messy sample" button so the review screen has something to show.
 */
export function messyRows(storeName = 'معرض النور للأجهزة') {
  const row = (patch) => ({
    'اسم المتجر': storeName,
    القطاع: 'أجهزة كهربائية',
    المحافظة: 'بغداد',
    'تاريخ الطلب': '04/11/2026',
    الكمية: '٤٥',
    'سعر الشراء': '145 الف',
    'سعر البيع': '٢١٠٬٠٠٠',
    الحالة: 'مكتمل',
    'مدة التوصيل': '18',
    الشريحة: 'متقاعد',
    'طريقة الدفع': 'تقسيط',
    ...patch,
  })
  return [
    row({}),
    row({ القطاع: 'موبايلات', 'تاريخ الطلب': EXCEL_SERIAL_2026_11_12, الكمية: 30, 'سعر الشراء': '88,000', 'سعر البيع': '120 ألف', الشريحة: 'موظف' }),
    row({ القطاع: 'سيارات', 'تاريخ الطلب': '2026-11-15' }), // unknown category -> needs a choice
    row({ الحالة: 'قيد التوصيل', 'تاريخ الطلب': '2026-11-16' }), // unknown status -> needs a choice
    row({ الكمية: 0, 'تاريخ الطلب': '2026-11-17' }), // error
    row({ 'تاريخ الطلب': '' }), // error: no date
    row({}), // duplicate of the first row
    row({ القطاع: 'عطور', 'سعر البيع': '٩٠ الف', 'سعر الشراء': '١٣٠ الف', 'تاريخ الطلب': '٢٠٢٦-١١-١٩', 'مدة التوصيل': '' }), // sells below cost, missing delivery
  ]
}
