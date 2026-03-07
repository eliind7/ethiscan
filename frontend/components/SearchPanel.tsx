"use client";

import { FormEvent, useState } from "react";

import type { CreateScanInput } from "@/lib/types";

interface SearchPanelProps {
  isSubmitting: boolean;
  onSubmit: (payload: CreateScanInput) => Promise<void> | void;
}

const EU_COUNTRIES = [
  "Austria",
  "Belgium",
  "Denmark",
  "Finland",
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Netherlands",
  "Spain",
  "Sweden"
];

const SECTORS = ["cosmetics", "pharma/biotech", "food/agriculture", "chemical", "tech/retail"];

export default function SearchPanel({ isSubmitting, onSubmit }: SearchPanelProps) {
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("cosmetics");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = companyName.trim();
    if (!normalizedName) {
      return;
    }

    await onSubmit({
      company_name: normalizedName,
      country: country || undefined,
      sector: sector || undefined
    });
  };

  return (
    <section className="panel p-6 md:p-8">
      <p className="panel-title">Start Scan</p>
      <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold md:text-4xl">
        Supplier Risk Intelligence
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
        Enter a company to generate an explainable ethical risk report with subscores, evidence signals,
        and source-level citations.
      </p>

      <form className="mt-8 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
        <label className="md:col-span-3">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Company Name
          </span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
            placeholder="L'Oreal, Nestle, Bayer..."
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Country
          </span>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">Any EU country</option>
            {EU_COUNTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Sector
          </span>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          >
            {SECTORS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Running scan..." : "Run Risk Scan"}
        </button>
      </form>
    </section>
  );
}
