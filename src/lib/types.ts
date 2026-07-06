export type Condition = "new" | "refurbished";

export interface Category {
  slug: string;
  name: string;
  /** Short label used on tiles and the bottom-sheet nav */
  shortName?: string;
  description: string;
  icon: string; // lucide icon name, resolved in CategoryIcon
  image?: string;
  children?: Category[];
  /** Approx. catalog size on the live store, shown as social proof */
  productCount?: number;
  featured?: boolean;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  /** Leaf category slug */
  category: string;
  condition: Condition;
  price: number; // INR, tax inclusive
  mrp?: number; // strike-through price
  images: string[];
  highlights: string[];
  specs: Spec[];
  warranty: string;
  stock: "in" | "low" | "out";
  rating?: number;
  reviewCount?: number;
  badge?: string;
}

export interface Store {
  city: string;
  area: string;
  address: string;
  phone: string;
  hours: string;
  mapsQuery: string;
}
