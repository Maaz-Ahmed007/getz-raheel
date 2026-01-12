"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type ProductEntry = {
	sku: string;
	name: string;
	columns: string[];
};

type Section = {
	categoryName: string;
	products: ProductEntry[];
};

type SKUResult = {
	categoryName: string;
	product: ProductEntry;
};

const COLUMN_LABELS = [
	"Group",
	"SKU",
	"Name",
	"Qty",
	"Amount",
	"Col 6",
	"Col 7",
	"Qty (2)",
	"Amount (2)",
];

export default function Page() {
	const [sections, setSections] = useState<Section[]>([]);
	const [skuIndex, setSkuIndex] = useState<Record<string, SKUResult[]>>({});
	const [sku, setSku] = useState("");
	const [results, setResults] = useState<SKUResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [fileName, setFileName] = useState<string>("");

	const totalProducts = useMemo(
		() => sections.reduce((acc, s) => acc + s.products.length, 0),
		[sections]
	);

	/* ---------- CLIENT PARSER ---------- */
	const parseHTMLFile = async (file: File) => {
		setLoading(true);
		setFileName(file.name);

		const text = await file.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "text/html");

		const rows = Array.from(doc.querySelectorAll("tr"));

		const parsedSections: Section[] = [];
		let currentProducts: ProductEntry[] = [];

		for (const row of rows) {
			const rowText = row.textContent || "";

			// Detect category total row (use first <td> only to avoid totals numbers)
			if (rowText.includes("Total:")) {
				const firstCellText =
					row.querySelector("td")?.textContent?.trim() || "";
				const categoryName = firstCellText.split("Total:")[0].trim();

				parsedSections.push({
					categoryName,
					products: currentProducts,
				});

				currentProducts = [];
				continue;
			}

			const cells = row.querySelectorAll("td");
			if (cells.length >= 3) {
				const maybeSku = cells[1]?.textContent?.trim() ?? "";
				if (!/^\d+$/.test(maybeSku)) continue;

				currentProducts.push({
					sku: maybeSku,
					name: cells[2]?.textContent?.trim() || "",
					columns: Array.from(cells).map(
						(td) => td.textContent?.trim() || ""
					),
				});
			}
		}

		setSections(parsedSections);
		setSkuIndex(buildSKUIndex(parsedSections));
		setResults([]);
		setSku("");
		setLoading(false);
	};

	/* ---------- SKU INDEX ---------- */
	const buildSKUIndex = (sections: Section[]) => {
		const index: Record<string, SKUResult[]> = {};

		for (const section of sections) {
			for (const product of section.products) {
				(index[product.sku] ??= []).push({
					categoryName: section.categoryName,
					product,
				});
			}
		}

		return index;
	};

	const handleSearch = () => {
		const key = sku.trim();
		setResults(skuIndex[key] || []);
	};

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<h1 className={styles.title}>SKU Finder</h1>
				<p className={styles.subtitle}>
					Upload the HTML report, then search by SKU.
				</p>
			</header>

			<section className={styles.topPanel}>
				<label className={styles.field}>
					<span className={styles.label}>Report HTML file</span>
					<input
						className={styles.fileInput}
						type="file"
						accept=".html,.htm"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) parseHTMLFile(file);
						}}
					/>
					{fileName && (
						<div className={styles.help}>Loaded: {fileName}</div>
					)}
				</label>

				{loading && <div className={styles.loading}>Parsing file…</div>}

				{sections.length > 0 && (
					<>
						<div className={styles.statsRow}>
							<div className={styles.stat}>
								<div className={styles.statLabel}>Sections</div>
								<div className={styles.statValue}>
									{sections.length}
								</div>
							</div>
							<div className={styles.stat}>
								<div className={styles.statLabel}>Products</div>
								<div className={styles.statValue}>
									{totalProducts}
								</div>
							</div>
							<div className={styles.stat}>
								<div className={styles.statLabel}>Matches</div>
								<div className={styles.statValue}>
									{results.length}
								</div>
							</div>
						</div>

						<div className={styles.searchRow}>
							<input
								className={styles.textInput}
								type="text"
								inputMode="numeric"
								placeholder="Enter SKU (numbers only)"
								value={sku}
								onChange={(e) => setSku(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSearch();
								}}
							/>
							<button
								className={styles.primaryButton}
								onClick={handleSearch}
							>
								Search
							</button>
						</div>
					</>
				)}
			</section>

			<main className={styles.results}>
				{sections.length > 0 &&
					!loading &&
					results.length === 0 &&
					sku.trim() && (
						<div className={styles.empty}>
							No matches found for <b>{sku.trim()}</b>.
						</div>
					)}

				{results.map((item, i) => {
					const cols = item.product.columns;
					return (
						<article key={i} className={styles.card}>
							<div className={styles.cardHeader}>
								<div className={styles.cardTitleWrap}>
									<h3 className={styles.cardTitle}>
										{item.categoryName}
									</h3>
									<div className={styles.cardSubTitle}>
										{item.product.name}
									</div>
								</div>
								<div className={styles.badge}>
									SKU {item.product.sku}
								</div>
							</div>

							<div className={styles.metrics}>
								<div className={styles.metric}>
									<div className={styles.metricLabel}>
										Qty
									</div>
									<div className={styles.metricValue}>
										{cols[3] ?? "-"}
									</div>
								</div>
								<div className={styles.metric}>
									<div className={styles.metricLabel}>
										Amount
									</div>
									<div className={styles.metricValue}>
										{cols[4] ?? "-"}
									</div>
								</div>
								<div className={styles.metric}>
									<div className={styles.metricLabel}>
										Qty (2)
									</div>
									<div className={styles.metricValue}>
										{cols[7] ?? "-"}
									</div>
								</div>
								<div className={styles.metric}>
									<div className={styles.metricLabel}>
										Amount (2)
									</div>
									<div className={styles.metricValue}>
										{cols[8] ?? "-"}
									</div>
								</div>
							</div>

							<details className={styles.details}>
								<summary className={styles.summary}>
									All columns
								</summary>

								<dl className={styles.kvGrid}>
									{item.product.columns.map((val, idx) => (
										<div className={styles.kv} key={idx}>
											<dt className={styles.kvKey}>
												{COLUMN_LABELS[idx] ??
													`Col ${idx + 1}`}
											</dt>
											<dd className={styles.kvValue}>
												{val || "-"}
											</dd>
										</div>
									))}
								</dl>
							</details>
						</article>
					);
				})}
			</main>
		</div>
	);
}
