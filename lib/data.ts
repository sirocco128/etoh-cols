export type SeoFields = {
  seoTitle: string;
  metaDescription: string;
  canonicalPath: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type Category = {
  name: string;
  slug: string;
  description: string;
  heroImage: string;
  seo: SeoFields;
};

export type Product = {
  name: string;
  slug: string;
  description: string;
  material: string;
  minOrder: number;
  priceRange: string;
  priceMin: number;
  priceMax: number;
  currency: "THB";
  images: string[];
  categorySlug: string;
  seo: SeoFields;
};

export type Faq = {
  question: string;
  answer: string;
  order: number;
};

export type Portfolio = {
  title: string;
  slug: string;
  client: string;
  industry: string;
  summary: string;
  image: string;
  services: string[];
  quantity: number;
  completedAt: string;
  featured: boolean;
};

export type Article = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  seo: SeoFields;
};

export const clientSegments: string[] = [
  "กลุ่มธุรกิจการเงิน",
  "ธุรกิจประกันภัย",
  "โรงพยาบาลและสุขภาพ",
  "สถาบันการศึกษา",
  "หน่วยงานภาครัฐ",
  "บริษัทเทคโนโลยี",
];

export const categories: Category[] = [
  {
    name: "Gift Set เพื่อสิ่งแวดล้อม",
    slug: "eco-giftset",
    description:
      "ชุดของขวัญองค์กรจากวัสดุรีไซเคิลและวัสดุธรรมชาติ เช่น สมุดรีไซเคิล หลอดไม้ไผ่ และถุงผ้า เหมาะกับงาน ESG และแคมเปญรักษ์โลก",
    heroImage: "/images/category-eco.svg",
    seo: {
      seoTitle: "Gift Set เพื่อสิ่งแวดล้อม",
      metaDescription:
        "สั่งผลิต Gift Set รักษ์โลกจากวัสดุรีไซเคิล วัสดุธรรมชาติ สมุดรีไซเคิล หลอดไม้ไผ่ และถุงผ้า สำหรับองค์กรที่เน้น ESG อย่างยั่งยืน",
      canonicalPath: "/giftset/eco-giftset",
      ogImage: "/images/category-eco.svg",
    },
  },
  {
    name: "ชุดของขวัญทริปบริษัท ทีมบิลดิ้ง",
    slug: "team-building-set",
    description:
      "เซ็ตของที่ระลึกสำหรับทริปบริษัทและงานทีมบิลดิ้ง ประกอบด้วยเสื้อ หมวก กระเป๋า กระบอกน้ำ และของใช้ตามธีมงาน",
    heroImage: "/images/category-team.svg",
    seo: {
      seoTitle: "Gift Set ทริปบริษัท ทีมบิลดิ้ง",
      metaDescription:
        "ออกแบบชุดของขวัญทริปบริษัทและทีมบิลดิ้ง สกรีนโลโก้ เสื้อ หมวก กระเป๋า กระบอกน้ำ ตามธีมงานองค์กรของคุณได้ตามงบประมาณ",
      canonicalPath: "/giftset/team-building-set",
      ogImage: "/images/category-team.svg",
    },
  },
  {
    name: "ชุดแก้วสแตนเลสเก็บอุณหภูมิ",
    slug: "tumbler-set",
    description:
      "เซ็ตกระบอกน้ำหรือแก้วสแตนเลสคู่กับสมุด ปากกา และกล่องจั่วปัง เหมาะเป็นของขวัญองค์กรที่ใช้ได้จริงทุกวัน",
    heroImage: "/images/category-tumbler.svg",
    seo: {
      seoTitle: "ชุดแก้วสแตนเลสเก็บอุณหภูมิ",
      metaDescription:
        "รับผลิตชุดแก้วสแตนเลสเก็บอุณหภูมิ พร้อมสมุด ปากกา และกล่องจั่วปัง สกรีนโลโก้องค์กร ขั้นต่ำเริ่มต้นได้ตามที่ต้องการ",
      canonicalPath: "/giftset/tumbler-set",
      ogImage: "/images/category-tumbler.svg",
    },
  },
  {
    name: "Gift Set อุปกรณ์ไอที",
    slug: "it-set",
    description:
      "ชุดของขวัญองค์กรด้านเทคโนโลยี เช่น Powerbank สายชาร์จ และอุปกรณ์พกพา สำหรับพนักงานใหม่หรือคู่ค้า",
    heroImage: "/images/category-it.svg",
    seo: {
      seoTitle: "Gift Set อุปกรณ์ไอที",
      metaDescription:
        "สั่งทำ Gift Set อุปกรณ์ไอที Powerbank สายชาร์จ และแกเจ็ตพกพา พร้อมสกรีนโลโก้สำหรับองค์กรและงานอีเวนต์อย่างมืออาชีพ",
      canonicalPath: "/giftset/it-set",
      ogImage: "/images/category-it.svg",
    },
  },
];

export const products: Product[] = [
  {
    name: "เซ็ตกระบอกน้ำสแตนเลส + สมุด + ปากกา",
    slug: "tumbler-notebook-pen-set",
    description:
      "ชุดของขวัญองค์กรประกอบด้วยกระบอกน้ำสแตนเลสเก็บอุณหภูมิ สมุดโน้ต และปากกา ในกล่องจั่วปังพรีเมียม พร้อมสกรีนหรือพิมพ์โลโก้ตามแบรนด์",
    material: "สแตนเลส 304 / หนัง PU / กระดาษจั่วปัง",
    minOrder: 30,
    priceRange: "350–590 บาท/ชุด",
    priceMin: 350,
    priceMax: 590,
    currency: "THB",
    images: ["/images/product-tumbler.svg"],
    categorySlug: "tumbler-set",
    seo: {
      seoTitle: "เซ็ตกระบอกน้ำ สมุด ปากกา",
      metaDescription:
        "เซ็ตกระบอกน้ำสแตนเลสพร้อมสมุดและปากกา สกรีนโลโก้องค์กร ขั้นต่ำ 30 ชุด ราคาโดยประมาณ 350–590 บาท ขอใบเสนอราคาได้ฟรีทันที",
      canonicalPath: "/products/tumbler-notebook-pen-set",
      ogImage: "/images/product-tumbler.svg",
    },
  },
  {
    name: "เซ็ตรักษ์โลก ถุงผ้า + หลอดไม้ไผ่ + สมุดรีไซเคิล",
    slug: "eco-tote-bamboo-set",
    description:
      "Gift Set เพื่อสิ่งแวดล้อม ประกอบถุงผ้าดิบ หลอดไม้ไผ่ และสมุดกระดาษรีไซเคิล เหมาะกับแคมเปญ ESG และของแจกงานองค์กร",
    material: "ผ้าดิบ / ไม้ไผ่ / กระดาษรีไซเคิล",
    minOrder: 50,
    priceRange: "180–320 บาท/ชุด",
    priceMin: 180,
    priceMax: 320,
    currency: "THB",
    images: ["/images/product-eco.svg"],
    categorySlug: "eco-giftset",
    seo: {
      seoTitle: "เซ็ตรักษ์โลก ถุงผ้า หลอดไม้ไผ่",
      metaDescription:
        "เซ็ตของขวัญรักษ์โลก ถุงผ้า หลอดไม้ไผ่ สมุดรีไซเคิล สั่งผลิตขั้นต่ำ 50 ชุด ราคาโดยประมาณ 180–320 บาท ขอใบเสนอราคาฟรี",
      canonicalPath: "/products/eco-tote-bamboo-set",
      ogImage: "/images/product-eco.svg",
    },
  },
  {
    name: "เซ็ตไอที Powerbank + สายชาร์จ 3-in-1",
    slug: "it-powerbank-set",
    description:
      "ชุดของขวัญไอทีสำหรับองค์กร ประกอบ Powerbank และสายชาร์จ 3-in-1 ในบรรจุภัณฑ์พรีเมียม พร้อมเลเซอร์หรือสกรีนโลโก้",
    material: "ABS / อะลูมิเนียม",
    minOrder: 50,
    priceRange: "420–690 บาท/ชุด",
    priceMin: 420,
    priceMax: 690,
    currency: "THB",
    images: ["/images/product-it.svg"],
    categorySlug: "it-set",
    seo: {
      seoTitle: "เซ็ตไอที Powerbank สายชาร์จ",
      metaDescription:
        "เซ็ตของขวัญไอที Powerbank พร้อมสายชาร์จ 3-in-1 สกรีนโลโก้ ขั้นต่ำ 50 ชุด ราคาโดยประมาณ 420–690 บาท ขอใบเสนอราคาได้ฟรี",
      canonicalPath: "/products/it-powerbank-set",
      ogImage: "/images/product-it.svg",
    },
  },
];

export const faqs: Faq[] = [
  {
    question: "สั่งผลิต Gift Set ขั้นต่ำกี่ชุด",
    answer:
      "ขั้นต่ำขึ้นกับประเภทสินค้า โดยทั่วไปเริ่มต้นประมาณ 30–50 ชุด สามารถแจ้งจำนวนที่ต้องการในแบบฟอร์มขอใบเสนอราคาเพื่อให้ทีมขายประเมินให้ตรงงบประมาณ",
    order: 1,
  },
  {
    question: "ใช้เวลาผลิตนานเท่าไหร่",
    answer:
      "ระยะเวลาผลิตโดยประมาณ 7–21 วันทำการ หลังยืนยันแบบและมัดจำ ขึ้นกับจำนวน เทคนิคตกแต่ง และช่วงเทศกาล แนะนำให้เผื่อเวลาจัดส่งล่วงหน้า",
    order: 2,
  },
  {
    question: "ขอดูตัวอย่างสินค้าก่อนสั่งได้ไหม",
    answer:
      "ได้ โดยสามารถขอตัวอย่างหรือ Mockup ตามรายการที่สนใจ ทีมงานจะแนะนำตัวเลือกวัสดุ เทคนิคสกรีน และบรรจุภัณฑ์ให้เหมาะสมกับงบและภาพลักษณ์แบรนด์",
    order: 3,
  },
  {
    question: "ออกใบกำกับภาษีได้หรือไม่",
    answer:
      "ออกใบกำกับภาษีได้ตามข้อมูลนิติบุคคลที่แจ้งไว้ กรุณาระบุรายละเอียดบริษัทในแบบฟอร์มหรือแจ้งฝ่ายขายเมื่อยืนยันออเดอร์",
    order: 4,
  },
];

export const portfolios: Portfolio[] = [
  {
    title: "Welcome Kit พนักงานใหม่",
    slug: "employee-welcome-kit",
    client: "บริษัทตัวอย่าง A",
    industry: "เทคโนโลยี",
    summary:
      "ออกแบบและผลิต Welcome Kit สำหรับพนักงานใหม่ ประกอบสมุด กระบอกน้ำ และของใช้สำนักงานในกล่องจั่วปังพร้อมโลโก้บริษัท",
    image: "/images/portfolio-welcome.svg",
    services: ["ออกแบบเซ็ต", "สกรีนโลโก้", "แพ็กแยกรายบุคคล"],
    quantity: 500,
    completedAt: "2025-11-15",
    featured: true,
  },
  {
    title: "ของขวัญปีใหม่สำหรับคู่ค้า",
    slug: "new-year-partner-gift",
    client: "บริษัทตัวอย่าง B",
    industry: "การเงิน",
    summary:
      "เซ็ตของขวัญปีใหม่สำหรับคู่ค้าองค์กร เน้นภาพลักษณ์พรีเมียม บรรจุภัณฑ์แข็งแรง และข้อความแบรนด์สุภาพ",
    image: "/images/portfolio-newyear.svg",
    services: ["คัดสรรวัสดุ", "พิมพ์ UV", "จัดส่งตามจุด"],
    quantity: 1200,
    completedAt: "2025-12-20",
    featured: true,
  },
  {
    title: "ESG Event Kit",
    slug: "esg-event-kit",
    client: "องค์กรตัวอย่าง C",
    industry: "พลังงาน",
    summary:
      "ชุดของแจกงาน ESG จากวัสดุรักษ์โลก ถุงผ้า หลอดไม้ไผ่ และสมุดรีไซเคิล พร้อมข้อความแคมเปญองค์กร",
    image: "/images/portfolio-esg.svg",
    services: ["เซ็ตรักษ์โลก", "สกรีนโลโก้", "แพ็กงานอีเวนต์"],
    quantity: 800,
    completedAt: "2026-03-01",
    featured: false,
  },
];

export const articles: Article[] = [
  {
    title: "คู่มือเลือกสินค้าพรีเมียมให้องค์กร",
    slug: "premium-products-guide",
    excerpt:
      "หลักการเลือก Gift Set และสินค้าพรีเมียมให้เหมาะกับภาพลักษณ์องค์กร งบประมาณ และกลุ่มผู้รับ",
    body: `<h2>ทำไมองค์กรต้องเลือก Gift Set อย่างมีหลักการ</h2>
<p>ของขวัญองค์กรไม่ใช่เพียงของแจก แต่สะท้อนภาพลักษณ์แบรนด์ ความใส่ใจต่อพนักงาน และความสัมพันธ์กับคู่ค้า</p>
<h3>กำหนดวัตถุประสงค์ให้ชัด</h3>
<p>เริ่มจากคำถามว่าของชุดนี้ใช้ต้อนรับพนักงานใหม่ มอบคู่ค้าปีใหม่ หรือแจกในงานสัมมนา เพื่อเลือกวัสดุและบรรจุภัณฑ์ให้เหมาะ</p>
<blockquote>เลือกของที่ใช้ได้จริง ดูแลรักษาง่าย และสอดคล้องกับค่านิยมองค์กร</blockquote>
<li>กำหนดงบต่อชุดและจำนวนขั้นต่ำ</li>
<li>เลือกรูปแบบการตกแต่งโลโก้ที่เหมาะสม</li>
<li>เผื่อเวลาผลิตและจัดส่งล่วงหน้า</li>
<h3>สรุป</h3>
<p>เมื่อมีวัตถุประสงค์ งบ และกำหนดส่งชัดเจน การขอใบเสนอราคาจะรวดเร็วและตรงความต้องการมากขึ้น</p>`,
    cover: "/images/article-guide.svg",
    author: "ทีมคอนเทนต์ GiftPro Asia",
    publishedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
    seo: {
      seoTitle: "คู่มือเลือกสินค้าพรีเมียมองค์กร",
      metaDescription:
        "หลักการเลือก Gift Set และสินค้าพรีเมียมให้องค์กร ครอบคลุมงบประมาณ วัสดุ การสกรีนโลโก้ และระยะเวลาผลิต เพื่อผลลัพธ์ที่เหมาะสม",
      canonicalPath: "/blog/premium-products-guide",
      ogImage: "/images/article-guide.svg",
    },
  },
];
