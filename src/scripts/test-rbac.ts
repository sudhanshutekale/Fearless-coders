import { validateSqlQuery, executeSafeQuery } from '../lib/rbac/query-guard';
import { UserRole } from '../lib/rbac/permissions';
import { getDb } from '../lib/db';

interface TestCase {
  name: string;
  role: UserRole;
  sql: string;
  expectedValid: boolean;
  expectedBlockedReasonSubstring?: string;
}

const testCases: TestCase[] = [
  // 1. Trainer trying to access payments table
  {
    name: 'Trainer: Direct SELECT from payments table',
    role: 'trainer',
    sql: 'SELECT * FROM payments',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'does not have permission to query table'
  },
  // 2. Trainer trying to access emi_installments
  {
    name: 'Trainer: SELECT from emi_installments',
    role: 'trainer',
    sql: 'SELECT student_id, amount, due_date FROM emi_installments',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'does not have permission to query table'
  },
  // 3. Trainer trying to join students with fee_plans
  {
    name: 'Trainer: Join students with fee_plans',
    role: 'trainer',
    sql: 'SELECT s.name, fp.total_amount FROM students s JOIN fee_plans fp ON s.id = fp.student_id',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'does not have permission to query table'
  },
  // 4. Trainer trying to access fee column even in a subquery or alias
  {
    name: 'Trainer: Attempting to select fee column',
    role: 'trainer',
    sql: 'SELECT total_fee FROM courses',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'restricted from accessing financial terms'
  },
  // 5. Counselor trying to query payments table
  {
    name: 'Counselor: Querying payments table',
    role: 'counselor',
    sql: 'SELECT * FROM payments WHERE amount > 5000',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'does not have permission to query table'
  },
  // 6. Injection attempt: Multi-statement attack (DROP TABLE)
  {
    name: 'Injection: Multiple statements with DROP TABLE',
    role: 'owner',
    sql: 'SELECT * FROM students; DROP TABLE audit_log;',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'Multiple SQL statements are strictly forbidden'
  },
  // 7. Injection attempt: SQL comment trick to bypass filters
  {
    name: 'Injection: SQL comments to obscure payload',
    role: 'owner',
    sql: 'SELECT * FROM students -- ignore rest\nWHERE id = 1',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'SQL comments are disabled for safety'
  },
  // 8. Mutation attempt: UPDATE statement
  {
    name: 'Mutation: Attempting UPDATE on students',
    role: 'owner',
    sql: "UPDATE students SET status = 'active' WHERE id = 's_001'",
    expectedValid: false,
    expectedBlockedReasonSubstring: 'Only read-only SELECT queries are permitted'
  },
  // 9. Accounts manager trying to query raw biometric attendance logs
  {
    name: 'Accounts: Attempting to query biometric attendance',
    role: 'accounts',
    sql: 'SELECT * FROM attendance',
    expectedValid: false,
    expectedBlockedReasonSubstring: 'does not have permission to query table'
  },
  // 10. Legitimate Trainer query: Allowed batches and attendance
  {
    name: 'Trainer: Legitimate query for batch attendance',
    role: 'trainer',
    sql: "SELECT s.name, a.date, a.status FROM attendance a JOIN students s ON s.id = a.student_id WHERE a.batch_id = 'b_java_m1'",
    expectedValid: true
  },
  // 11. Legitimate Accounts query: Pending EMIs
  {
    name: 'Accounts: Legitimate query for pending EMIs',
    role: 'accounts',
    sql: "SELECT s.name, e.amount, e.due_date FROM emi_installments e JOIN students s ON s.id = e.student_id WHERE e.status = 'pending'",
    expectedValid: true
  },
  // 12. Legitimate Owner query: Java batch students with missed classes and EMI due
  {
    name: 'Owner: Full operational query across attendance & fees',
    role: 'owner',
    sql: `
      SELECT s.name, s.phone, COUNT(a.id) as missed_count, e.due_date, e.amount
      FROM students s
      JOIN enrollments en ON en.student_id = s.id
      JOIN batches b ON b.id = en.batch_id
      JOIN attendance a ON a.student_id = s.id AND a.status = 'absent'
      JOIN emi_installments e ON e.student_id = s.id AND e.status = 'pending'
      WHERE b.name LIKE '%Java%'
      GROUP BY s.id
    `,
    expectedValid: true
  }
];

async function runTests() {
  console.log('🛡️  Running InstiPilot Security & RBAC Guard Suite...\n');
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const res = validateSqlQuery(tc.sql, tc.role);

    let testPassed = res.isValid === tc.expectedValid;
    if (testPassed && !tc.expectedValid && tc.expectedBlockedReasonSubstring) {
      testPassed = (res.blockedReason || '').toLowerCase().includes(tc.expectedBlockedReasonSubstring.toLowerCase());
    }

    if (testPassed) {
      console.log(`  ✅ [PASS] ${tc.name}`);
      passed++;
    } else {
      console.log(`  ❌ [FAIL] ${tc.name}`);
      console.log(`     Expected Valid: ${tc.expectedValid}, Got: ${res.isValid}`);
      console.log(`     Blocked Reason: ${res.blockedReason}`);
      failed++;
    }
  }

  // Also test live execution sandbox with audit log entry
  console.log('\n🔒 Testing Read-Only Database Execution & Audit Logging...');
  const fakeTrainer = { id: 'u_trainer', name: 'Vikram Malhotra', role: 'trainer' as UserRole };
  const execResult = await executeSafeQuery('SELECT * FROM payments', fakeTrainer, 'Show me all student payments');

  if (execResult.blocked && execResult.blockedReason?.includes('payments')) {
    console.log('  ✅ [PASS] Live query execution sandbox blocked forbidden table');
    passed++;
  } else {
    console.log('  ❌ [FAIL] Live query failed to block forbidden query');
    failed++;
  }

  // Verify audit log has the blocked entry recorded
  const db = getDb();
  const lastAudit = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 1').get() as any;
  if (lastAudit && lastAudit.status === 'blocked' && lastAudit.role === 'trainer') {
    console.log(`  ✅ [PASS] Blocked attempt successfully recorded in audit_log (ID: ${lastAudit.id})`);
    passed++;
  } else {
    console.log('  ❌ [FAIL] Audit log entry was not found');
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`RBAC Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All RBAC & prompt-injection security tests PASSED flawlessly!');
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
