import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, MessageCircle, CreditCard, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { categories } from "@/data/categories";
import { locations } from "@/data/locations";

const promises = [
  { icon: ShieldCheck, title: "Authorised store", text: "Dell, HP, Lenovo & Asus exclusive partner" },
  { icon: Truck, title: "Pan-India delivery", text: "Fast, insured shipping on every order" },
  { icon: RotateCcw, title: "Easy returns", text: "Simple cancellation & refund policy" },
  { icon: CreditCard, title: "Flexible payment", text: "Cards, UPI, net-banking, EMI & COD" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 lg:pb-0">
      {/* Promise strip */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4">
        {promises.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/brand/logo.png"
                alt="Laptop Store, The Laptop Specialist"
                width={193}
                height={48}
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              The Laptop Specialist since 2007. 10 lakh+ customers, 150+ professionals, and authorised
              brand stores across India.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a href="tel:+919500156666" className="inline-flex items-center gap-2 text-ink-700 hover:text-brand-600">
                <Phone className="h-4 w-4" aria-hidden="true" /> +91 95001 56666
              </a>
              <a
                href="https://wa.me/919500156666"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-ink-700 hover:text-brand-600"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
              </a>
            </div>
          </div>

          <nav aria-label="Shop">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">Shop</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-ink-500 hover:text-brand-600">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">Support</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/service" className="text-ink-500 hover:text-brand-600">Book a repair</Link></li>
              <li><Link href="/stores" className="text-ink-500 hover:text-brand-600">Store locator</Link></li>
              <li><Link href="/cart" className="text-ink-500 hover:text-brand-600">Cart</Link></li>
              <li><span className="text-ink-300">Shipping policy</span></li>
              <li><span className="text-ink-300">Cancellation &amp; refunds</span></li>
              <li><span className="text-ink-300">Privacy policy</span></li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-900">Our stores</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {locations.map((c) => (
                <li key={c.city}>
                  <Link
                    href={`/stores#${c.slug}`}
                    className="flex items-center gap-2 text-ink-500 hover:text-brand-600"
                  >
                    <MapPin className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                    {c.city} · {c.branches.length} {c.branches.length === 1 ? "store" : "stores"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-ink-300 sm:flex-row">
          <p>© {new Date().getFullYear()} Laptop Store India. All rights reserved.</p>
          <p>Prices include all taxes · EMI, UPI, cards &amp; COD accepted</p>
        </div>
      </div>
    </footer>
  );
}
