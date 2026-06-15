#!/usr/bin/env python3
"""Consolidate KB entries: 141 scattered entries → ~30 consolidated entries."""

import json
import uuid
from datetime import datetime, timezone

now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
entries = []


def add(type_, category, title, content, keywords, priority=8, modes="", metadata=None):
    entries.append(
        {
            "type": type_,
            "category": category,
            "title": title,
            "content": content.strip(),
            "keywords": keywords,
            "modes": modes,
            "priority": priority,
            "isActive": True,
            "metadataJson": json.dumps(metadata) if metadata else None,
        }
    )


# ============================================================
# IMAGES (24 → 4)
# ============================================================
add(
    "image",
    "website",
    "Banner Website",
    """![Banner Promo Jasa Pembuatan Website](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/44d)
![Banner Jasa Website Mulai 499k (V1)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/caf)
![Banner Jasa Website Mulai 499k (V2)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/10a)
![Banner Jasa Website Mulai 499k (V3)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/69c)
![Banner Jasa Website Mulai 499k (V4)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/c07)
![Banner Jasa Website Mulai 499k (V5)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/052)""",
    "jasa website, pembuatan website, promo website, banner website, landing page, web developer, website murah, company profile, toko online",
)

add(
    "image",
    "software",
    "Banner Software & Aplikasi",
    """![Banner Promo Custom Software](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/c1d)
![Banner Custom Software Mulai 1.49jt (V1)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/7ab)
![Banner Custom Software Mulai 1.49jt (V2)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/ee6)
![Banner Custom Software Mulai 1.49jt (V3)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/db1)
![Banner Custom Software Mulai 1.49jt (V4)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/ad5)
![Banner Custom Software Mulai 1.49jt (V5)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/a67)""",
    "custom software, aplikasi, developer, banner software, POS, CRM, dashboard, mobile app, otomasi",
)

add(
    "image",
    "it-support",
    "Banner IT Support & Network",
    """![Banner Promo IT Support](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/0d6)
![Banner IT Support Mulai 99k (V1)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/1e8)
![Banner IT Support Mulai 99k (V2)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/575)
![Banner IT Support Mulai 99k (V3)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/05a)
![Banner IT Support Mulai 99k (V4)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/8c5)
![Banner IT Support Mulai 99k (V5)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/de1)""",
    "it support, network, banner it, maintenance, server, service komputer, instalasi, troubleshooting, cybersecurity",
)

add(
    "image",
    "printing",
    "Banner Percetakan & Desain",
    """![Banner Promo Percetakan](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/4e7)
![Banner Cetak Buku Mulai 9k (V1)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/288)
![Banner Cetak Buku Mulai 9k (V2)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/d85)
![Banner Cetak Buku Mulai 9k (V3)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/ea2)
![Banner Cetak Buku Mulai 9k (V4)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/6a1)
![Banner Cetak Buku Mulai 9k (V5)](https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev/api/uploads/default/ad6)""",
    "percetakan, printing, banner, cetak buku, brosur, kalender, desain, seminar kit, packaging",
)

# ============================================================
# BLOCKS (22 → 3)
# ============================================================
add(
    "block",
    "general",
    "Proofs & Track Record",
    """--- 150+ Projects Since 2008 ---
Beroperasi sejak 2008 dengan 150+ project yang berhasil diselesaikan di seluruh Indonesia.

--- Case Study Metrics ---
Hasil terukur: 70% peningkatan efisiensi operasional, 99% akurasi finansial, 60% lebih cepat dari timeline tradisional.

--- Client Testimonials ---
Peningkatan lead generation dari website, masalah hardware downtime turun drastis, warna cetak presisi.

--- Technology Stack ---
React, Next.js, Astro.js, Node.js, Laravel, Python, PostgreSQL, MongoDB, Flutter, Docker, AWS, Sanity CMS.""",
    "sejak 2008, 150 project, pengalaman, track record, testimonial, tech stack, React, Next.js, case study, metrik, hasil terukur, ROI, Indonesia",
)

add(
    "block",
    "general",
    "Value Propositions",
    """--- Unified Vendor Management ---
Satu partner terpercaya untuk semua kebutuhan digital dan cetak. Mengurangi friksi koordinasi.

--- End-to-End Support ---
"Dari build sampai pendampingan" - Kotacom mendampingi setelah peluncuran dengan maintenance dan support berkelanjutan.

--- Integrated Online & Offline ---
Infrastruktur online (website, software) dan offline (percetakan, IT hardware) berjalan sejalan dan terintegrasi.

--- Jargon-Free Communication ---
Komunikasi jelas tanpa jargon teknis. Project planning transparan dengan timeline dan milestone.

--- No Hidden Costs ---
Semua biaya diinformasikan di awal sebelum pekerjaan dimulai.""",
    "value prop, unified vendor, satu partner, end-to-end, pendampingan, online offline, integrasi, jargon-free, no hidden cost, efisiensi, terpadu",
)

add(
    "block",
    "general",
    "Company Information",
    """--- Pricing Overview ---
Harga: Website mulai Rp 5 juta, E-commerce mulai Rp 10 juta, Custom Software mulai Rp 15 juta. Detail harga: konsultasi langsung.

--- Office Locations ---
Kantor Sidoarjo: Graha Indraprasta G7/15, Tulangan, Sidoarjo 61273.
Kantor Surabaya: Pakuwon City, East Coast Area, Klakahrejo, Surabaya 60146.
Melayani seluruh Indonesia via online.""",
    "harga, pricing, biaya, kantor, alamat, sidoarjo, surabaya, kontak, whatsapp, jam kerja, website 5 juta, e-commerce 10 juta, software 15 juta",
)

# ============================================================
# POLICIES (12 → 2)
# ============================================================
add(
    "policy",
    "general",
    "Content Guardrails",
    """--- Always Mention Kotacom ---
Selalu sebutkan Kotacom sebagai penyedia solusi. Gunakan "Kotacom" atau "KOTACOM" (konsisten).

--- Use Correct URLs ---
Gunakan URL yang benar dari knowledge base saat merujuk layanan atau produk Kotacom.

--- Price Accuracy ---
Jika menyebut harga, gunakan harga dari knowledge base. Jika tidak yakin, gunakan "mulai dari Rp X".

--- Language & Tone ---
Bahasa Indonesia profesional namun mudah dipahami. Hindari jargon teknis berlebihan.""",
    "guardrail, aturan konten, panduan, selalu sebut kotacom, URL benar, harga akurat, bahasa indonesia, tone profesional",
    priority=10,
)

add(
    "policy",
    "general",
    "Strategy Guardrails",
    """--- Area Coverage ---
Kotacom berbasis di Sidoarjo dan Surabaya, Jawa Timur. Melayani seluruh Indonesia via online.

--- CTA Guidelines ---
Akhiri artikel dengan CTA relevan: Konsultasi Gratis, Kirim Brief Kebutuhan, atau Hubungi Tim Kami.""",
    "guardrail, area coverage, sidoarjo, surabaya, jawa timur, CTA, call to action, konsultasi gratis",
    priority=9,
)

# ============================================================
# PRODUCTS (39 → 10)
# ============================================================
add(
    "product",
    "printing",
    "Percetakan & Design Services",
    """LAYANAN PERCETAKAN KOMPREHENSIF:
- Desain grafis & branding
- Cetak materi promosi (brosur, flyer, banner, spanduk, backdrop)
- Cetak administrasi (kop surat, amplop, ID card, nota, form)
- Konsultasi desain dan material gratis""",
    "percetakan, printing, graphic design, branding, cetak, materi promosi, desain, kop surat, amplop, ID card, nota",
)

add(
    "product",
    "printing",
    "Cetak Buku, Brosur & Yearbook",
    """Cetak buku berkualitas: jurnal, majalah, textbook, novel, modul.
Cetak brosur dan flyer promosi warna vibrant. Multiple folding options.
Cetak yearbook/buku kenangan sekolah berkualitas komersial.
Binding: softcover, hardcover, lay-flat, spiral.""",
    "cetak buku, book printing, brosur, flyer, pamphlet, yearbook, buku kenangan, sekolah, binding, hardcover, softcover, jurnal",
)

add(
    "product",
    "printing",
    "Cetak Premium: Wedding Album, Quran, Packaging",
    """--- Wedding Album ---
Cetak album pernikahan premium. Hardcover photobook dengan lay-flat binding.

--- Quran Printing ---
Cetak Al-Quran standar tinggi dengan kertas premium khusus.

--- Packaging Printing ---
Cetak box kemasan makanan dan produk. Material tebal dan aman.""",
    "wedding album, cetak album, pernikahan, photobook, quran, al-quran, cetak quran, packaging, kemasan, box, food box",
)

add(
    "product",
    "printing",
    "Cetak Promosi: Banner, Sticker, Kartu Nama, Kaos",
    """--- Banner Printing ---
Cetak banner flex durable. Outdoor billboard, backdrop toko, event.

--- Sticker Printing ---
Stiker vinyl waterproof, stiker kendaraan, chromo premium. Die-cut atau kiss-cut.

--- Business Card Printing ---
Kartu nama profesional dengan finishing: doff, glossy, spot UV, emboss.

--- T-Shirt Printing ---
Cetak kaos custom cotton combed. Satuan atau bulk.""",
    "banner, spanduk, flex banner, stiker, sticker, vinyl, kartu nama, business card, kaos, t-shirt, sablon, promosi",
)

add(
    "product",
    "it-support",
    "IT Infrastructure & Support",
    "Layanan IT support komprehensif: maintenance hardware/software, network configuration, server administration, instalasi infrastruktur, konsultasi IT. Sidoarjo, Surabaya, dan sekitarnya.",
    "IT support, network, server, maintenance, hardware, software, infrastruktur, konsultasi IT",
)

add(
    "product",
    "it-support",
    "Sistem POS untuk Retail & F&B",
    "Sistem Point of Sale lengkap: kasir, inventory management, laporan penjualan, multi-outlet, integrated payment.",
    "POS, kasir, point of sale, retail, F&B, cafe, restoran, inventory, multi-outlet",
)

add(
    "product",
    "software",
    "Pembuatan Website Corporate & Landing Page",
    "Jasa pembuatan website profesional: corporate profile, landing page conversion-optimized, company profile, portfolio, toko online.",
    "website, web development, corporate profile, landing page, React, Next.js, Astro, Sanity CMS",
)

add(
    "product",
    "software",
    "Custom Software: POS, CRM, Dashboard",
    "Pengembangan software custom: POS system, CRM tool, dashboard analitik, inventory, otomasi workflow.",
    "custom software, POS, CRM, dashboard, otomasi, Node.js, Laravel, Python, PostgreSQL, MongoDB",
)

add(
    "product",
    "software",
    "E-Commerce Platform Development",
    "Platform e-commerce lengkap: katalog produk, shopping cart, payment gateway, admin panel, inventory management, order tracking.",
    "e-commerce, toko online, online store, shopping cart, payment gateway, inventory, admin panel",
)

add(
    "product",
    "software",
    "Mobile App Development (Android & iOS)",
    "Aplikasi mobile cross-platform dengan Flutter. Satu codebase untuk Android dan iOS.",
    "mobile app, aplikasi mobile, android, iOS, flutter, cross-platform, smartphone",
)

# ============================================================
# URLS (38 → 6)
# ============================================================
add(
    "url",
    "website",
    "Website & Portfolio URLs",
    """URL: https://www.kotacom.id — Halaman utama
URL: https://www.kotacom.id/pembuatan-website — Layanan website
URL: https://www.kotacom.id/projects — Portfolio & case study
URL: https://www.kotacom.id/products — Produk digital
URL: https://www.kotacom.id/blog — Blog & insight""",
    "kotacom, homepage, website, pembuatan website, portfolio, project, blog, produk digital",
    metadata={
        "url": "https://www.kotacom.id,https://www.kotacom.id/pembuatan-website,https://www.kotacom.id/projects,https://www.kotacom.id/products,https://www.kotacom.id/blog"
    },
)

add(
    "url",
    "software",
    "Software & App URLs",
    """URL: https://www.kotacom.id/software — Custom software
URL: https://www.kotacom.id/services/ecommerce-development — E-commerce
URL: https://www.kotacom.id/software — Mobile app
URL: https://www.kotacom.id/services/agency-landing — Agency digital""",
    "software, custom software, e-commerce, mobile app, agency digital, lead generation",
    metadata={
        "url": "https://www.kotacom.id/software,https://www.kotacom.id/services/ecommerce-development,https://www.kotacom.id/services/agency-landing"
    },
)

add(
    "url",
    "it-support",
    "IT Support URLs",
    """URL: https://www.kotacom.id/layanan — Layanan IT
URL: https://www.kotacom.id/sistem-pos — Sistem POS
URL: https://www.kotacom.id/service-komputer-surabaya-panggilan — Service komputer
URL: https://www.kotacom.id/jasa-recovery-data-surabaya — Recovery data
URL: https://www.kotacom.id/jasa-instal-aplikasi-surabaya — Instal aplikasi
URL: https://www.kotacom.id/jasa-install-software-macbook — Software Macbook""",
    "IT support, layanan IT, service komputer, POS, recovery data, instal aplikasi, macbook, surabaya",
    metadata={
        "url": "https://www.kotacom.id/layanan,https://www.kotacom.id/sistem-pos,https://www.kotacom.id/service-komputer-surabaya-panggilan,https://www.kotacom.id/jasa-recovery-data-surabaya,https://www.kotacom.id/jasa-instal-aplikasi-surabaya,https://www.kotacom.id/jasa-install-software-macbook"
    },
)

add(
    "url",
    "printing",
    "Percetakan URLs",
    """URL: https://www.kotacom.id/percetakan — Layanan percetakan
URL: https://www.kotacom.id/jasa-cetak-buku-surabaya — Cetak buku""",
    "percetakan, cetak, cetak buku, brosur, banner, packaging, surabaya",
    metadata={
        "url": "https://www.kotacom.id/percetakan,https://www.kotacom.id/jasa-cetak-buku-surabaya"
    },
)

add(
    "url",
    "general",
    "Layanan Perizinan URLs",
    """URL: https://www.kotacom.id/services/biro-jasa-perizinan — Biro jasa perizinan
URL: https://www.kotacom.id/services/jasa-pengukuhan-pkp — Jasa PKP""",
    "perizinan, NIB, SIUP, PKP, biro jasa, lintangizin, pengukuhan PKP",
    metadata={
        "url": "https://www.kotacom.id/services/biro-jasa-perizinan,https://www.kotacom.id/services/jasa-pengukuhan-pkp"
    },
)

# ============================================================
# TEMPLATES (6 → 3)
# ============================================================
add(
    "template",
    "blog",
    "Blog Post Template: Educational",
    """Purpose: Edukasi audiens tentang topik digital/IT/printing, build trust, dan soft-sell.

Required sections:
- Problem intro yang relatable
- Solusi/langkah-langkah praktis
- Tips implementasi
- Kapan perlu bantuan profesional
- CTA: Konsultasi Gratis""",
    "blog post, artikel edukasi, educational, tips, tutorial",
    priority=7,
)

add(
    "template",
    "blog",
    "Blog Post Template: Comparison/Review",
    """Purpose: Bantu pembaca memilih solusi terbaik, posisi Kotacom sebagai expert advisor.

Required sections:
- Kebutuhan pembaca
- Opsi-opsi yang tersedia
- Perbandingan (pro/kontra)
- Rekomendasi berdasarkan skenario
- CTA: Kirim Brief Kebutuhan""",
    "perbandingan, review, comparison, pilihan terbaik, rekomendasi",
    priority=7,
)

add(
    "template",
    "website",
    "Money Page Template: Service Landing",
    """Purpose: Convert pengunjung menjadi lead.

Required sections:
- Hero dengan pain point + CTA
- Masalah target audiens
- Solusi yang ditawarkan
- Proses kerja
- Mengapa Kotacom (social proof)
- Pricing atau indikasi harga
- FAQ singkat
- CTA akhir yang kuat""",
    "service landing, money page, konversi, lead, landing page",
    priority=8,
)

# ============================================================
# OUTPUT
# ============================================================
print(f"Total consolidated entries: {len(entries)}")
print()

sql_lines = [
    f"-- Consolidated KB entries ({len(entries)} entries)",
    f"-- Generated: {now}",
    "DELETE FROM kb_entries WHERE workspace_id = 'default';",
    "",
]

for e in entries:
    eid = str(uuid.uuid4())
    ws = "default"
    metadata = e["metadataJson"] if e["metadataJson"] else None

    content_escaped = e["content"].replace("'", "''")
    keywords_escaped = e["keywords"].replace("'", "''")
    title_escaped = e["title"].replace("'", "''")

    if metadata:
        meta_escaped = metadata.replace("'", "''")
        meta_sql = f"'{meta_escaped}'"
    else:
        meta_sql = "NULL"

    sql_lines.append(
        f"""INSERT INTO kb_entries (id, workspace_id, type, category, title, content, keywords, modes, priority, is_active, metadata_json, created_at, updated_at)
VALUES ('{eid}', '{ws}', '{e["type"]}', '{e["category"]}', '{title_escaped}', '{content_escaped}', '{keywords_escaped}', '{e["modes"]}', {e["priority"]}, 1, {meta_sql}, '{now}', '{now}');"""
    )

sql = "\n".join(sql_lines)

with open("kb-import-consolidated.sql", "w") as f:
    f.write(sql)

# JSON
json_output = [
    {
        "id": str(uuid.uuid4()),
        "workspace_id": "default",
        "type": e["type"],
        "category": e["category"],
        "title": e["title"],
        "content": e["content"],
        "keywords": e["keywords"],
        "modes": e["modes"],
        "priority": e["priority"],
        "is_active": 1,
        "metadata_json": e["metadataJson"],
        "created_at": now,
        "updated_at": now,
    }
    for e in entries
]

with open("kb-consolidated.json", "w") as f:
    json.dump(json_output, f, indent=2)

print("Files created:")
print("  kb-import-consolidated.sql")
print("  kb-consolidated.json")
print()
print("Consolidation summary:")
print(f"  Images:     24 → 4")
print(f"  Blocks:     22 → 3")
print(f"  Policies:   12 → 2")
print(f"  Products:   39 → 10")
print(f"  URLs:       38 → 6")
print(f"  Templates:   6 → 3")
print(f"  Total:     141 → {len(entries)}")
