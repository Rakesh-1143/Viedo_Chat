import test from "node:test";
import assert from "node:assert/strict";
import { formatCallDuration, getCallErrorMessage } from "./call.js";

test("formats short and long call durations", () => {
  assert.equal(formatCallDuration(5), "00:05");
  assert.equal(formatCallDuration(65), "01:05");
  assert.equal(formatCallDuration(3661), "01:01:01");
});

test("turns browser media errors into actionable messages", () => {
  assert.match(
    getCallErrorMessage({ name: "NotAllowedError" }),
    /browser settings/,
  );
  assert.match(getCallErrorMessage({ name: "NotFoundError" }), /No camera/);
});

