"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Wrench,
  Search,
  MessageCircle,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Clock,
  Truck,
  Monitor,
  BatteryCharging,
  Keyboard,
  Cpu,
  Droplets,
  HardDrive,
  Power,
  DatabaseBackup,
  Settings,
  Upload,
  Phone,
  IndianRupee,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { locations } from "@/data/locations";
import BrandLogo, { brandNames } from "@/components/BrandLogo";

const devices = ["Laptop", "Desktop / AIO", "MacBook", "Printer", "Other"];

const commonIssues = [
  "Screen damage",
  "Battery / charging",
  "Keyboard / touchpad",
  "Won't power on",
  "Slow / needs upgrade",
  "Liquid damage",
  "Overheating",
  "No display",
];

const repairTypes: { Icon: LucideIcon; title: string; blurb: string; from: string }[] = [
  { Icon: Monitor, title: "Screen replacement", blurb: "Cracked, lines, flicker or black display.", from: "₹1,999" },
  { Icon: BatteryCharging, title: "Battery & charging", blurb: "Drains fast, won't charge, port loose.", from: "₹1,499" },
  { Icon: Keyboard, title: "Keyboard & touchpad", blurb: "Dead keys, ghost typing, trackpad dead.", from: "₹899" },
  { Icon: Cpu, title: "Motherboard / chip-level", blurb: "No power, dead board, GPU faults.", from: "₹2,499" },
  { Icon: Droplets, title: "Liquid damage", blurb: "Spills — cleaning & board rescue.", from: "₹1,999" },
  { Icon: HardDrive, title: "SSD & RAM upgrades", blurb: "Make an old laptop feel brand new.", from: "₹1,299" },
  { Icon: Power, title: "Won't power on", blurb: "Dead, boot loops, no POST.", from: "₹499" },
  { Icon: DatabaseBackup, title: "Data recovery", blurb: "Recover files from failed drives.", from: "₹1,499" },
  { Icon: Settings, title: "Software & OS", blurb: "Windows, drivers, virus, slowdowns.", from: "₹499" },
];

const trustPoints = [
  { Icon: BadgeCheck, text: "Authorised service centre" },
  { Icon: ShieldCheck, text: "Genuine parts only" },
  { Icon: Clock, text: "Most fixes same-day" },
  { Icon: Truck, text: "Free pickup & drop*" },
];

const whyPoints = [
  { Icon: Wrench, title: "150+ expert engineers", text: "Chip-level specialists across 6 cities." },
  { Icon: ShieldCheck, title: "90-day repair warranty", text: "Every repair backed in writing." },
  { Icon: IndianRupee, title: "Upfront pricing", text: "Free diagnosis, no fix–no fee." },
  { Icon: Clock, title: "Same-day turnaround", text: "Most common repairs done in hours." },
];

export default function ServiceFlow() {
  const sp = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState(devices[0]);
  const [brand, setBrand] = useState("");
  const [cityCode, setCityCode] = useState(locations[0].city);
  const [problem, setProblem] = useState(sp.get("q") ?? "");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [jobCode, setJobCode] = useState("");

  const goToForm = (preset?: string) => {
    if (preset) setProblem((p) => (p.trim() ? p : preset));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buildMessage = () =>
    `Hi! I'd like to book a repair.\nCity: ${cityCode}\nBrand: ${brand || "—"}\nDevice: ${device}\nProblem: ${
      problem.trim() || "—"
    }${photoName ? `\n(Photo ready to share: ${photoName})` : ""}\nName: ${name || "—"}\nPhone: ${phone || "—"}`;

  // City → representative pincode for service-node routing (mock build;
  // a real pincode field replaces this at go-live)
  const CITY_PIN: Record<string, string> = {
    Chennai: "600042", Bangalore: "560001", Bengaluru: "560001", Mumbai: "400001",
    Pune: "411001", Hyderabad: "500001", Kolkata: "700001", Coimbatore: "641001", Vijayawada: "520001",
  };

  const submit = async () => {
    if (name.trim().length < 2) return setError("Please enter your name.");
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone))
      return setError("Please enter a valid 10-digit mobile number.");
    setError(null);
    try {
      const r = await fetch("/api/checkout/repair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: { name: name.trim(), phone: cleanPhone, pincode: CITY_PIN[cityCode] ?? "600042" },
          serviceType: "diagnosis",
          brand: brand || "Unknown",
          model: device,
          issue: problem.trim() || "diagnosis needed",
          mode: "dropoff",
          slot: { date: new Date().toISOString().slice(0, 10), window: "10:00-12:00" },
          payAdvance: false,
        }),
      });
      const j = await r.json();
      if (!j.ok) return setError(j.error ?? "Could not book the repair.");
      setJobCode(j.data.code);
      setDone(true);
    } catch {
      setError("Could not reach the booking service. Try WhatsApp below.");
    }
  };

  const quickDiagnosis = () => {
    window.open(
      `https://wa.me/919500156666?text=${encodeURIComponent(
        `Hi! I need a diagnosis.\nDevice: ${device}\nProblem: ${problem.trim() || "—"}`,
      )}`,
      "_blank",
      "noopener",
    );
  };

  const inputCls =
    "w-full rounded-xl bg-white px-4 py-3 text-sm text-ink-900 ring-1 ring-line outline-none transition-shadow placeholder:text-ink-300 focus:ring-2 focus:ring-brand-500";
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-brand-600 text-white" : "bg-white text-ink-700 ring-1 ring-line hover:bg-brand-50"
    }`;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-space-950 text-white">
        <Image
          src="/categories/repair-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-space-950 via-space-950/80 to-space-950/30" aria-hidden="true" />
        <div className="bg-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80">
              <Wrench className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" /> Repair &amp; service
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Laptop broken?
              <br />
              <span className="text-accent-400">Tell us the problem.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              Free diagnosis, genuine parts and same-day fixes at an authorised service centre. Describe the
              issue — we&apos;ll take it from there.
            </p>

            {/* Issue search */}
            <div className="mt-6 flex max-w-lg items-center gap-2 rounded-2xl bg-white p-1.5 shadow-(--shadow-float)">
              <span className="pl-3 text-ink-300">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToForm()}
                placeholder="e.g. screen cracked, won't turn on…"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-300"
              />
              <button
                type="button"
                onClick={() => goToForm()}
                className="shrink-0 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-accent-600"
              >
                Book repair
              </button>
            </div>

            {/* Issue chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {commonIssues.slice(0, 6).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToForm(i)}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-accent-400 hover:text-white"
                >
                  {i}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goToForm()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-400 px-6 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-accent-600 active:scale-[0.98]"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" /> Book a repair
              </button>
              <button
                type="button"
                onClick={quickDiagnosis}
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <MessageCircle className="h-4 w-4 text-accent-400" aria-hidden="true" /> WhatsApp diagnosis
              </button>
            </div>

            {/* Trust points */}
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              {trustPoints.map(({ Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-2 text-xs font-medium text-white/70">
                  <Icon className="h-4 w-4 text-accent-400" aria-hidden="true" /> {text}
                </span>
              ))}
            </div>
          </div>

          {/* Laptop image */}
          <div className="relative hidden lg:block">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: "radial-gradient(380px 300px at 55% 50%, rgb(252 212 0 / 0.14), transparent 70%)" }}
            />
            <div className="relative mx-auto h-[22rem] w-full">
              <Image src="/categories/repair.png" alt="Laptop repair" fill priority sizes="520px" className="object-contain drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── We fix it. You use it. ───────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-7xl px-4 lg:mt-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">What we fix</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            We fix it. You use it.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            From cracked screens to chip-level board repair — pick your issue and book in seconds.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {repairTypes.map(({ Icon, title, blurb, from }) => (
            <div
              key={title}
              className="group flex flex-col rounded-3xl bg-white p-5 ring-1 ring-line transition-all duration-300 hover:-translate-y-1 hover:ring-brand-200 hover:shadow-(--shadow-card-hover)"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-(--shadow-card) transition-transform group-hover:scale-110">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-ink-900">{title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-500">{blurb}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-400">
                  from <span className="text-brand-600">{from}</span>
                </span>
                <button
                  type="button"
                  onClick={() => goToForm(title)}
                  className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                >
                  Book this
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Booking form ─────────────────────────────────────────── */}
      <section ref={formRef} className="mx-auto mt-16 max-w-3xl scroll-mt-24 px-4 lg:mt-24">
        {done ? (
          <div className="flex flex-col items-center rounded-3xl bg-white p-10 text-center ring-1 ring-line">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold text-ink-900">Repair booked</h2>
            {jobCode && <p className="mt-1 font-mono text-sm text-brand-600">{jobCode}</p>}
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              Your {device.toLowerCase()} is booked at our nearest {cityCode} service centre — free diagnosis,
              we call to confirm the slot. Track it anytime under My Orders.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/account" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Track repair</a>
              <a
                href={`https://wa.me/919500156666?text=${encodeURIComponent(`Hi, about my repair ${jobCode || ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 ring-1 ring-line hover:bg-surface"
              >
                WhatsApp us
              </a>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 ring-1 ring-line hover:bg-surface"
              >
                Book another
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            <div className="border-b border-line bg-surface/60 px-6 py-5">
              <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">Book your repair</h2>
              <p className="mt-1 text-sm text-ink-500">Free diagnosis · we call to confirm the slot.</p>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              {/* City */}
              <div>
                <label htmlFor="sf-city" className="mb-1.5 block text-xs font-semibold text-ink-700">City</label>
                <select id="sf-city" value={cityCode} onChange={(e) => setCityCode(e.target.value)} className={inputCls}>
                  {locations.map((c) => (
                    <option key={c.slug} value={c.city}>{c.city}</option>
                  ))}
                </select>
              </div>
              {/* Brand */}
              <div>
                <label htmlFor="sf-brand" className="mb-1.5 block text-xs font-semibold text-ink-700">Brand</label>
                <select id="sf-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls}>
                  <option value="">Select brand</option>
                  {brandNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              {/* Device */}
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold text-ink-700">Device</p>
                <div className="flex flex-wrap gap-2">
                  {devices.map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)} className={chip(device === d)}>{d}</button>
                  ))}
                </div>
              </div>
              {/* Problem */}
              <div className="sm:col-span-2">
                <label htmlFor="sf-problem" className="mb-2 block text-xs font-semibold text-ink-700">
                  What&apos;s the problem?
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {commonIssues.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setProblem(i)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        problem === i ? "bg-brand-600 text-white" : "bg-surface text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <textarea
                  id="sf-problem"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={2}
                  placeholder="Describe the issue in your words…"
                  className={inputCls}
                />
              </div>
              {/* Photo upload */}
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold text-ink-700">Add a photo (optional)</p>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-surface/50 px-4 py-3.5 text-sm text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  <Upload className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  <span className="truncate">{photoName ?? "Upload a photo of the damage"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                  />
                </label>
              </div>
              {/* Name + phone */}
              <div>
                <label htmlFor="sf-name" className="mb-1.5 block text-xs font-semibold text-ink-700">Your name</label>
                <input id="sf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
              </div>
              <div>
                <label htmlFor="sf-phone" className="mb-1.5 block text-xs font-semibold text-ink-700">Mobile number</label>
                <input id="sf-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className={inputCls} />
              </div>

              {error ? (
                <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger sm:col-span-2">
                  {error}
                </p>
              ) : null}

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={submit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-400 px-6 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-accent-600 active:scale-[0.99]"
                >
                  <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" /> Book via WhatsApp
                </button>
                <p className="mt-3 text-center text-xs text-ink-300">No spam — we only call about this booking.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Why choose us ────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 lg:mt-24">
        <div className="bg-mesh relative overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">Why choose us</p>
            <h2 className="mt-2 max-w-lg font-display text-2xl font-bold sm:text-3xl">
              Why choose our repair service
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {whyPoints.map(({ Icon, title, text }) => (
                <div key={title} className="glass rounded-2xl p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-400/20 text-accent-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{text}</p>
                </div>
              ))}
            </div>
            <a
              href="tel:+919500156666"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-white/90"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> Talk to a service expert
            </a>
          </div>
        </div>
      </section>

      {/* ── Brands we service ────────────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-7xl px-4 pb-4 lg:mt-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
          We service all major brands
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:gap-3">
          {brandNames.map((b) => (
            <div
              key={b}
              className="flex items-center justify-center rounded-xl bg-white px-3 py-4 ring-1 ring-line"
            >
              <BrandLogo brand={b} colored className="h-8 w-auto sm:h-9" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
