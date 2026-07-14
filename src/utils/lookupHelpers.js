const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const normalizeLookupValue = (value) => {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/[\s._-]+/g, "")
    .toLowerCase();

  if (!cleaned) return "";

  const digitsOnly = cleaned.replace(/\D/g, "");
  const canonicalDigits = digitsOnly.replace(/^0+/, "") || "0";

  return [cleaned, canonicalDigits].filter(Boolean);
};

const detectDelimiter = (line) => {
  const candidates = [";", ",", "\t"];
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: (line.match(new RegExp(`\\${delimiter}`, "g")) ?? []).length,
  }));

  return counts.sort((a, b) => b.count - a.count)[0]?.delimiter ?? ";";
};

const parseCsvLine = (line, delimiter = ",") => {
  const values = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
};

const parseCsvRows = (text) => {
  const rows = [];
  const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const delimiter = detectDelimiter(line);
    rows.push(parseCsvLine(line, delimiter));
  }

  return rows;
};

export const parseLookupCsv = (text) => {
  const rows = parseCsvRows(text);

  if (!rows.length) {
    return { entries: [], error: "The CSV file is empty." };
  }

  const hasHeaderRow = rows[0].some((value) => {
    const normalized = normalizeHeader(value);
    return ["number", "code", "barcode", "id", "name", "label"].includes(normalized);
  });

  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const headerRow = hasHeaderRow ? rows[0] : null;

  const numberIndex = headerRow
    ? headerRow.findIndex((value) => {
        const normalized = normalizeHeader(value);
        return ["number", "code", "barcode", "id", "itemnumber", "itemno"].includes(normalized);
      })
    : 0;

  const nameIndex = headerRow
    ? headerRow.findIndex((value) => {
        const normalized = normalizeHeader(value);
        return ["name", "label", "description", "title", "person", "customer"].includes(normalized);
      })
    : 1;

  if (numberIndex < 0 || nameIndex < 0) {
    return {
      entries: [],
      error: "Expected at least two columns: one for the code/number and one for the name.",
    };
  }

  const entries = dataRows
    .map((row) => {
      const number = row[numberIndex] ?? "";
      const name = row[nameIndex] ?? "";

      if (!String(number).trim() || !String(name).trim()) {
        return null;
      }

      return {
        number: String(number).trim(),
        name: String(name).trim(),
      };
    })
    .filter(Boolean);

  return { entries, error: null };
};

export const findLookupMatch = (scannedValue, entries = []) => {
  const scanValues = normalizeLookupValue(scannedValue);
  if (!scanValues.length) return null;

  return entries.find((entry) => {
    const entryValues = normalizeLookupValue(entry?.number);

    return entryValues.some((value) => scanValues.includes(value));
  }) ?? null;
};
