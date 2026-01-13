"use client";

import { useMemo, useState } from "react";

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
		setResults(skuIndex[sku.trim()] || []);
	};

	return (
		<div className="min-h-screen bg-gray-200/50 p-3 pb-20">
			<div className="mx-auto max-w-md space-y-4">
				{/* Header */}
				<header className="space-y-1">
					<h1 className="text-sm font-semibold text-gray-800">
						SKU Finder
					</h1>
					<p className="text-xs text-gray-600">
						Upload report and search products by SKU
					</p>
				</header>

				{/* Upload */}
				<section className="rounded border bg-white p-3 space-y-1">
					<label className="block text-xs text-gray-600">
						Report HTML file
					</label>
					<input
						type="file"
						accept=".html,.htm"
						className="block w-full text-sm"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) parseHTMLFile(file);
						}}
					/>
					{fileName && (
						<p className="text-xs text-gray-500 truncate">
							Loaded: {fileName}
						</p>
					)}
					{loading && (
						<p className="text-xs text-gray-500">Parsing file…</p>
					)}
				</section>

				{/* Stats + Search */}
				{sections.length > 0 && (
					<section className="space-y-3">
						<div className="grid grid-cols-3 gap-2 text-center text-xs">
							<div className="rounded border bg-white p-2">
								<div className="text-gray-500">Sections</div>
								<div className="font-medium">
									{sections.length}
								</div>
							</div>
							<div className="rounded border bg-white p-2">
								<div className="text-gray-500">Products</div>
								<div className="font-medium">
									{totalProducts}
								</div>
							</div>
							<div className="rounded border bg-white p-2">
								<div className="text-gray-500">Matches</div>
								<div className="font-medium">
									{results.length}
								</div>
							</div>
						</div>

						<div className="flex gap-2">
							<input
								type="text"
								inputMode="numeric"
								placeholder="Enter SKU"
								className="flex-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
								value={sku}
								onChange={(e) => setSku(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSearch();
								}}
							/>
							<button
								onClick={handleSearch}
								className="rounded bg-blue-600 px-3 py-1 text-sm text-white active:bg-blue-700"
							>
								Search
							</button>
						</div>
					</section>
				)}

				{/* Results */}
				<main className="space-y-3">
					{sections.length > 0 &&
						!loading &&
						results.length === 0 &&
						sku.trim() && (
							<p className="text-xs text-gray-500">
								No matches found for <b>{sku.trim()}</b>.
							</p>
						)}

					{results.map((item, i) => {
						const cols = item.product.columns;
						return (
							<article
								key={i}
								className="rounded border bg-white p-3 space-y-2"
							>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-gray-700">
										{item.categoryName}
									</p>
									<p className="text-sm text-gray-800">
										{item.product.name}
									</p>
									<p className="text-xs text-gray-500">
										SKU {item.product.sku}
									</p>
								</div>

								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="rounded border p-2">
										<div className="text-gray-500">Qty</div>
										<div>{cols[3] ?? "-"}</div>
									</div>
									<div className="rounded border p-2">
										<div className="text-gray-500">
											Amount
										</div>
										<div>{cols[4] ?? "-"}</div>
									</div>
									<div className="rounded border p-2">
										<div className="text-gray-500">
											Qty (2)
										</div>
										<div>{cols[7] ?? "-"}</div>
									</div>
									<div className="rounded border p-2">
										<div className="text-gray-500">
											Amount (2)
										</div>
										<div>{cols[8] ?? "-"}</div>
									</div>
								</div>

								<details className="text-xs">
									<summary className="cursor-pointer text-gray-600">
										All columns
									</summary>
									<dl className="mt-2 space-y-1">
										{item.product.columns.map(
											(val, idx) => (
												<div
													key={idx}
													className="flex justify-between gap-2"
												>
													<dt className="text-gray-500">
														{COLUMN_LABELS[idx] ??
															`Col ${idx + 1}`}
													</dt>
													<dd className="text-right">
														{val || "-"}
													</dd>
												</div>
											)
										)}
									</dl>
								</details>
							</article>
						);
					})}
				</main>
			</div>
		</div>
	);
}
