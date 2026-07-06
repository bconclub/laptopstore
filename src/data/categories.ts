import type { Category } from "@/lib/types";

/**
 * Category tree mirrored from the live laptopstoreindia.com catalog
 * (OpenCart sitemap, ~4,100 URLs). Product counts are approximate,
 * taken from the live sitemap segment sizes.
 */
export const categories: Category[] = [
  {
    slug: "laptops",
    name: "Laptops",
    description: "New laptops from every major brand, authorised Dell, HP, Lenovo and Asus store.",
    icon: "laptop",
    productCount: 710,
    featured: true,
    children: [
      {
        slug: "dell-laptops",
        name: "Dell Laptops",
        description: "Inspiron, Latitude, Vostro, XPS and Alienware.",
        icon: "laptop",
        children: [
          { slug: "dell-inspiron", name: "Dell Inspiron", description: "Everyday laptops.", icon: "laptop" },
          { slug: "dell-latitude", name: "Dell Latitude", description: "Business laptops.", icon: "briefcase" },
          { slug: "dell-vostro", name: "Dell Vostro", description: "Small-business laptops.", icon: "briefcase" },
          { slug: "dell-xps", name: "Dell XPS", description: "Premium ultrabooks.", icon: "sparkles" },
          { slug: "dell-alienware", name: "Alienware", description: "Gaming flagships.", icon: "gamepad-2" },
        ],
      },
      {
        slug: "hp-laptops",
        name: "HP Laptops",
        description: "HP 14/15 series, ProBook, EliteBook, Omen and Spectre.",
        icon: "laptop",
        children: [
          { slug: "hp-14-15", name: "HP 14 & 15 Series", description: "Everyday laptops.", icon: "laptop" },
          { slug: "hp-probook", name: "HP ProBook", description: "Business laptops.", icon: "briefcase" },
          { slug: "hp-elitebook", name: "HP EliteBook", description: "Premium business.", icon: "briefcase" },
          { slug: "hp-omen", name: "HP Omen", description: "Gaming laptops.", icon: "gamepad-2" },
          { slug: "hp-spectre", name: "HP Spectre", description: "Premium ultrabooks.", icon: "sparkles" },
        ],
      },
      {
        slug: "lenovo-laptops",
        name: "Lenovo Laptops",
        description: "IdeaPad, ThinkPad, Yoga and Legion.",
        icon: "laptop",
        children: [
          { slug: "lenovo-ideapad", name: "IdeaPad", description: "Everyday laptops.", icon: "laptop" },
          { slug: "lenovo-thinkpad", name: "ThinkPad", description: "Business icons.", icon: "briefcase" },
          { slug: "lenovo-yoga", name: "Yoga", description: "2-in-1 convertibles.", icon: "tablet" },
          { slug: "lenovo-legion", name: "Legion", description: "Gaming laptops.", icon: "gamepad-2" },
        ],
      },
      {
        slug: "asus-laptops",
        name: "Asus Laptops",
        description: "Vivobook, ZenBook, ROG and EeeBook.",
        icon: "laptop",
        children: [
          { slug: "asus-vivobook", name: "Vivobook", description: "Everyday laptops.", icon: "laptop" },
          { slug: "asus-zenbook", name: "ZenBook", description: "Premium ultrabooks.", icon: "sparkles" },
          { slug: "asus-rog", name: "ROG", description: "Gaming laptops.", icon: "gamepad-2" },
        ],
      },
      {
        slug: "acer-laptops",
        name: "Acer Laptops",
        description: "Aspire, Swift, TravelMate and Predator.",
        icon: "laptop",
        children: [
          { slug: "acer-aspire", name: "Aspire", description: "Everyday laptops.", icon: "laptop" },
          { slug: "acer-swift", name: "Swift", description: "Thin & light.", icon: "sparkles" },
          { slug: "acer-predator", name: "Predator", description: "Gaming laptops.", icon: "gamepad-2" },
        ],
      },
      {
        slug: "apple-laptops",
        name: "Apple",
        description: "MacBook Air, MacBook Pro, iMac and Mac Mini.",
        icon: "laptop",
        children: [
          { slug: "macbook-air", name: "MacBook Air", description: "Thin & light Macs.", icon: "laptop" },
          { slug: "macbook-pro", name: "MacBook Pro", description: "Pro performance.", icon: "laptop" },
          { slug: "imac", name: "iMac", description: "All-in-one desktops.", icon: "monitor" },
          { slug: "mac-mini", name: "Mac Mini", description: "Compact desktops.", icon: "server" },
        ],
      },
    ],
  },
  {
    slug: "refurbished-laptops",
    name: "Refurbished Laptops",
    shortName: "Refurbished",
    description: "Certified refurbished business laptops, tested by our own service engineers. Up to 60% off.",
    icon: "refresh-cw",
    productCount: 180,
    featured: true,
    children: [
      { slug: "refurbished-dell", name: "Dell Refurbished", description: "Latitude & Precision.", icon: "refresh-cw" },
      { slug: "refurbished-hp", name: "HP Refurbished", description: "EliteBook & ProBook.", icon: "refresh-cw" },
      { slug: "refurbished-lenovo", name: "Lenovo Refurbished", description: "ThinkPad series.", icon: "refresh-cw" },
      { slug: "refurbished-apple", name: "Apple Refurbished", description: "MacBook series.", icon: "refresh-cw" },
    ],
  },
  {
    slug: "gaming-laptops",
    name: "Gaming Laptops",
    shortName: "Gaming",
    description: "Predator, ROG, Alienware, Omen and Legion, RTX-powered machines.",
    icon: "gamepad-2",
    productCount: 60,
    featured: true,
  },
  {
    slug: "laptop-spares",
    name: "Laptop Spares",
    shortName: "Spares",
    description: "India's largest laptop spare-part catalog, 2,600+ genuine parts for every brand.",
    icon: "wrench",
    productCount: 2619,
    featured: true,
    children: [
      { slug: "laptop-battery", name: "Laptop Battery", description: "All brands.", icon: "battery-charging" },
      { slug: "laptop-keyboard", name: "Laptop Keyboard", description: "All brands.", icon: "keyboard" },
      { slug: "laptop-screen", name: "Laptop Screen", description: "LCD / LED panels.", icon: "monitor" },
      { slug: "laptop-adapter", name: "Adapter & Charger", description: "All brands.", icon: "plug" },
      { slug: "laptop-motherboard", name: "Motherboard", description: "All brands.", icon: "cpu" },
      { slug: "laptop-hinges", name: "Hinges & Body", description: "Panels, bezels, hinges.", icon: "wrench" },
      { slug: "laptop-fan", name: "Fan & Heatsink", description: "Cooling parts.", icon: "fan" },
      { slug: "storage-ram", name: "Storage & RAM", description: "SSD, HDD, memory.", icon: "hard-drive" },
      { slug: "hp-original-parts", name: "HP Original Parts", description: "Genuine HP spares.", icon: "badge-check" },
    ],
  },
  {
    slug: "computers",
    name: "Computers & Desktops",
    shortName: "Computers",
    description: "Desktops, all-in-ones, workstations, servers and monitors.",
    icon: "monitor",
    productCount: 47,
    featured: true,
    children: [
      { slug: "desktops", name: "Desktops", description: "Acer, Asus, Dell, HP, Lenovo towers.", icon: "computer" },
      { slug: "all-in-one", name: "All-in-One PCs", description: "Space-saving desktops.", icon: "monitor" },
      { slug: "workstations", name: "Workstations", description: "Dell, HP, Lenovo pro rigs.", icon: "cpu" },
      { slug: "servers", name: "Servers", description: "Dell, HP, Lenovo, IBM, Cisco.", icon: "server" },
      { slug: "monitors", name: "Monitors", description: "Dell, LG, Samsung, BenQ.", icon: "monitor" },
      { slug: "software", name: "Software", description: "OS, antivirus, applications.", icon: "shield-check" },
    ],
  },
  {
    slug: "printers",
    name: "Printers",
    description: "HP, Canon and Epson printers with genuine supplies.",
    icon: "printer",
    productCount: 40,
    featured: true,
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Bags, cooling pads, keyboards, mice and more.",
    icon: "headphones",
    productCount: 120,
    featured: false,
  },
];

export function flattenCategories(list: Category[] = categories): Category[] {
  return list.flatMap((c) => [c, ...(c.children ? flattenCategories(c.children) : [])]);
}

export function findCategory(slug: string): Category | undefined {
  return flattenCategories().find((c) => c.slug === slug);
}

/** Returns the trail from root to the given slug, for breadcrumbs. */
export function categoryTrail(slug: string): Category[] {
  const walk = (list: Category[], trail: Category[]): Category[] | null => {
    for (const c of list) {
      const next = [...trail, c];
      if (c.slug === slug) return next;
      if (c.children) {
        const found = walk(c.children, next);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(categories, []) ?? [];
}
