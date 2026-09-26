import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanText,
  escapeRegex,
  normalizeEmail,
  parsePositiveInteger,
  validateEmail,
  validatePassword,
  validateProfilePicture,
} from "../src/utils/validation.js";

test("normalizes and validates email addresses", () => {
  const email = normalizeEmail("  Person@Example.COM ");
  assert.equal(email, "person@example.com");
  assert.equal(validateEmail(email), true);
  assert.equal(validateEmail("not-an-email"), false);
});

test("requires a bounded password containing letters and numbers", () => {
  assert.equal(validatePassword("language9"), true);
  assert.equal(validatePassword("onlyletters"), false);
  assert.equal(validatePassword("12345678"), false);
  assert.equal(validatePassword("a1"), false);
});

test("bounds text and pagination input", () => {
  assert.equal(cleanText("  hello world  ", 5), "hello");
  assert.equal(parsePositiveInteger("200", 10, 50), 50);
  assert.equal(parsePositiveInteger("nope", 10, 50), 10);
});

test("escapes regular-expression input", () => {
  assert.equal(escapeRegex("a+b?(c)"), "a\\+b\\?\\(c\\)");
});

test("only accepts safe web or image data URLs for avatars", () => {
  assert.equal(validateProfilePicture("https://example.com/avatar.png"), true);
  assert.equal(validateProfilePicture("data:image/png;base64,AAAA"), true);
  assert.equal(validateProfilePicture("http://example.com/avatar.png"), false);
  assert.equal(
    validateProfilePicture(`data:image/png;base64,${"A".repeat(3_000_000)}`),
    false,
  );
  assert.equal(validateProfilePicture("javascript:alert(1)"), false);
});
