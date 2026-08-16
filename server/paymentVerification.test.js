import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createPaymentVerificationService,
  PaymentVerificationError,
  PAYMENT_RECORD_SOURCE,
} from "./paymentVerification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FakeSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = data !== undefined;
    this._data = data;
  }
  data() {
    return this._data;
  }
}

class FakeQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
}

class FakeQuery {
  constructor(collection, filters = []) {
    this.collection = collection;
    this.filters = filters;
  }
  where(field, op, value) {
    assert.equal(op, "==");
    return new FakeQuery(this.collection, [...this.filters, { field, value }]);
  }
  async get() {
    const docs = this.collection.list().filter((doc) =>
      this.filters.every(({ field, value }) => doc.data()[field] === value),
    );
    return new FakeQuerySnapshot(docs);
  }
}

class FakeDocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").at(-1);
  }
  async get() {
    return new FakeSnapshot(this, this.db.records.get(this.path));
  }
  async set(value) {
    this.db.records.set(this.path, structuredClone(value));
  }
  collection(name) {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }
}

class FakeCollectionRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }
  doc(id) {
    return new FakeDocRef(this.db, `${this.path}/${id}`);
  }
  where(field, op, value) {
    return new FakeQuery(this, [{ field, op, value }]);
  }
  list() {
    const prefix = `${this.path}/`;
    return [...this.db.records.keys()]
      .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map((key) => new FakeSnapshot(new FakeDocRef(this.db, key), this.db.records.get(key)));
  }
}

class FakeDb {
  constructor() {
    this.records = new Map();
  }
  collection(...segments) {
    return new FakeCollectionRef(this, segments.join("/"));
  }
}

const FieldValueStub = { serverTimestamp: () => ({ _serverTimestamp: true }) };

const REFERENCE = "FEES-stu1-1755250000000";
const PARENT_UID = "+233201234567";

const baseInput = () => ({
  reference: REFERENCE,
  schoolId: "school1",
  studentId: "stu1",
  allocations: [
    {
      feeId: "online_payment",
      feeName: "School Fees",
      amountPaid: 100,
      academicYear: "2025-2026",
      term: "Term 1",
    },
  ],
});

const paystackSuccess = (overrides = {}) => ({
  ok: true,
  status: true,
  data: {
    status: "success",
    amount: 10000, // 100.00 GHS in pesewas
    currency: "GHS",
    reference: REFERENCE,
    metadata: { studentId: "stu1", schoolId: "school1" },
    channel: "mobile_money",
    gateway_response: "Success",
    paid_at: "2026-08-15T10:00:00Z",
    ...overrides,
  },
});

const buildWorld = ({ financeVersion = "v2" } = {}) => {
  const db = new FakeDb();
  db.records.set("students/stu1", {
    schoolId: "school1",
    classId: "p1",
    fatherPhone: "+233201234567",
    name: "Test Learner",
  });
  db.records.set("schools/school1", { status: "active", name: "Test School" });
  db.records.set(`schools/school1/financeSettings/main`, {
    schoolId: "school1",
    financeVersion,
  });
  db.records.set("schools/school1/feeLedgers/ledger1", {
    schoolId: "school1",
    studentId: "stu1",
    academicYear: "2025-2026",
    term: "Term 1",
    fees: [{ feeId: "fee1", feeName: "Tuition", amount: 200 }],
  });
  return db;
};

const buildService = (db, verifyTransaction) =>
  createPaymentVerificationService({
    db,
    FieldValue: FieldValueStub,
    verifyTransaction,
    now: () => 1755250000000,
  });

const parentCaller = { uid: PARENT_UID, role: "parent" };

const assertErrorCode = async (promise, code) => {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PaymentVerificationError);
    assert.equal(error.code, code);
    return true;
  });
};

test("missing reference is rejected before Paystack is called", async () => {
  const db = buildWorld();
  let verifyCalls = 0;
  const service = buildService(db, async () => {
    verifyCalls += 1;
    return paystackSuccess();
  });
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, {
      ...baseInput(),
      reference: "",
    }),
    "INVALID_REFERENCE",
  );
  assert.equal(verifyCalls, 0);
});

test("invalid/unknown reference fails Paystack verification", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => ({
    ok: false,
    status: false,
    data: null,
  }));
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, baseInput()),
    "PAYSTACK_VERIFICATION_FAILED",
  );
  assert.equal(db.records.size, 4); // nothing written
});

test("failed Paystack transaction is rejected", async () => {
  const db = buildWorld();
  const service = buildService(db, async () =>
    paystackSuccess({ status: "failed", gateway_response: "Declined" }),
  );
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, baseInput()),
    "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL",
  );
  assert.equal(db.records.size, 4);
});

test("amount mismatch between Paystack and allocations is rejected", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => paystackSuccess({ amount: 5000 }));
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, baseInput()),
    "AMOUNT_MISMATCH",
  );
  assert.equal(db.records.size, 4);
});

test("parent not linked to the student is rejected", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => paystackSuccess());
  await assertErrorCode(
    service.verifyAndRecordPayment(
      { uid: "+233999999999", role: "parent" },
      baseInput(),
    ),
    "FORBIDDEN",
  );
  assert.equal(db.records.size, 4);
});

test("student belonging to a different school is rejected", async () => {
  const db = buildWorld();
  db.records.set("students/stu1", {
    schoolId: "school2",
    classId: "p1",
    fatherPhone: PARENT_UID,
  });
  const service = buildService(db, async () => paystackSuccess());
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, baseInput()),
    "STUDENT_SCHOOL_MISMATCH",
  );
});

test("reference metadata bound to another student cannot be replayed", async () => {
  const db = buildWorld();
  db.records.set("students/stu2", {
    schoolId: "school1",
    classId: "p1",
    fatherPhone: PARENT_UID,
  });
  const service = buildService(db, async () => paystackSuccess());
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, {
      ...baseInput(),
      studentId: "stu2",
    }),
    "REFERENCE_MISMATCH",
  );
});

test("allocation without a matching ledger is rejected", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => paystackSuccess());
  await assertErrorCode(
    service.verifyAndRecordPayment(parentCaller, {
      ...baseInput(),
      allocations: [
        { ...baseInput().allocations[0], term: "Term 9" },
      ],
    }),
    "LEDGER_NOT_FOUND",
  );
});

test("successful payment writes authoritative records (v2 layout)", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => paystackSuccess());
  const result = await service.verifyAndRecordPayment(parentCaller, {
    ...baseInput(),
    allocations: [
      { feeId: "online_payment", feeName: "School Fees", amountPaid: 60, academicYear: "2025-2026", term: "Term 1" },
      { feeId: "online_payment", feeName: "School Fees", amountPaid: 40, academicYear: "2025-2026", term: "Term 1" },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.recordedCount, 2);
  assert.equal(result.verifiedAmountGhs, 100);
  const first = db.records.get(`schools/school1/payments/PAYVRF-${REFERENCE}-0`);
  assert.ok(first);
  assert.equal(first.source, PAYMENT_RECORD_SOURCE);
  assert.equal(first.paystackVerified, true);
  assert.equal(first.receiptNumber, REFERENCE);
  assert.equal(first.studentId, "stu1");
  assert.equal(first.schoolId, "school1");
  assert.equal(first.amountPaid, 60);
  assert.equal(first.paymentMethod, "MoMo");
  const second = db.records.get(`schools/school1/payments/PAYVRF-${REFERENCE}-1`);
  assert.ok(second);
  assert.equal(second.amountPaid, 40);
});

test("v1 schools record into the top-level payments collection", async () => {
  const db = buildWorld({ financeVersion: "v1" });
  const service = buildService(db, async () => paystackSuccess());
  const result = await service.verifyAndRecordPayment(parentCaller, baseInput());
  assert.equal(result.recordedCount, 1);
  assert.ok(db.records.get(`payments/PAYVRF-${REFERENCE}-0`));
});

test("repeating the same reference is idempotent", async () => {
  const db = buildWorld();
  const service = buildService(db, async () => paystackSuccess());
  const first = await service.verifyAndRecordPayment(parentCaller, baseInput());
  assert.equal(first.recordedCount, 1);
  const second = await service.verifyAndRecordPayment(parentCaller, baseInput());
  assert.equal(second.idempotent, true);
  assert.equal(second.recordedCount, 0);
  assert.equal(second.alreadyRecordedCount, 1);
  const paymentDocs = [...db.records.keys()].filter((key) => key.includes("PAYVRF-"));
  assert.equal(paymentDocs.length, 1);
});

test("school admin of another school is rejected", async () => {
  const db = buildWorld();
  db.records.set("users/admin1", { role: "school_admin", schoolId: "school2" });
  const service = buildService(db, async () => paystackSuccess());
  await assertErrorCode(
    service.verifyAndRecordPayment({ uid: "admin1" }, baseInput()),
    "FORBIDDEN",
  );
});

test("manual admin payments: rules still allow school admin create, parents denied on both layouts", async () => {
  const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");

  // The nested payments block must no longer grant parents create access.
  const nestedPaymentsBlock = rules.split("match /schools/{schoolId}/payments/{paymentId}")[1]
    .split("match /")[0];
  const nestedCreateRules = nestedPaymentsBlock.match(/allow create:[^;]+;/g) || [];
  const nestedParentCreate = nestedCreateRules.some((rule) => rule.includes("isParent()"));
  assert.equal(
    nestedParentCreate,
    false,
    "parents must not be able to create nested payment documents directly",
  );

  // School admins keep manual create access on the nested layout.
  const nestedAdminCreate = nestedCreateRules.some((rule) => rule.includes("isSchoolAdmin()"));
  assert.equal(nestedAdminCreate, true, "school admins must keep nested payment create access");

  // The legacy top-level payments block (there are two; the second is the
  // one with role-based create rules) must also deny parents.
  const legacyBlocks = rules.split("match /payments/{paymentId}");
  const legacyPaymentsBlock = legacyBlocks[legacyBlocks.length - 1].split("match /")[0];
  const legacyCreateRules = legacyPaymentsBlock.match(/allow create:[^;]+;/g) || [];
  const legacyParentCreate = legacyCreateRules.some((rule) => rule.includes("isParent()"));
  assert.equal(
    legacyParentCreate,
    false,
    "parents must not be able to create legacy payment documents directly",
  );

  // School admins keep manual create access on the legacy layout.
  const legacyHasSchoolAdmin = legacyCreateRules.some((rule) => rule.includes("isSchoolAdmin()"))
    || legacyPaymentsBlock.includes("schoolAdminOwnsSchool");
  assert.equal(legacyHasSchoolAdmin, true, "legacy payments create must still allow school admins");
});
