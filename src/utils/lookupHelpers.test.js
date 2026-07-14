import assert from "node:assert/strict";
import test from "node:test";
import { findLookupMatch, parseLookupCsv } from "./lookupHelpers.js";

test("parses CSV rows and resolves a matching name", () => {
  const result = parseLookupCsv("number,name\n12345,Jane Doe\n67890,John Smith\n");

  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].number, "12345");
  assert.equal(result.entries[0].name, "Jane Doe");
  assert.equal(findLookupMatch("12345", result.entries)?.name, "Jane Doe");
});

test("matches numeric values while ignoring whitespace and punctuation", () => {
  const result = parseLookupCsv("Code,Name\n 00123 ,Alice\n");

  assert.equal(findLookupMatch("123", result.entries)?.name, "Alice");
  assert.equal(findLookupMatch("999", result.entries), null);
});

test("parses semicolon-delimited lookup files", () => {
  const result = parseLookupCsv("12345;test\n3707337;tedasd\n");

  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].number, "12345");
  assert.equal(result.entries[0].name, "test");
});
