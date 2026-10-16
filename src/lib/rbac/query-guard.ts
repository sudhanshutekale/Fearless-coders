import { UserRole, isTableAllowed, isColumnForbidden } from './permissions';
import { getReadOnlyDb, getDb } from '@/lib/db';

export interface ValidationResult {
  isValid: boolean;
  sanitizedSql?: string;
  blockedReason?: string;
  violations?: string[];
  extractedTables?: string[];
}

export interface QueryExecutionResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
  executedSql?: string;
  blocked?: boolean;
  blockedReason?: string;
  executionTimeMs?: number;
}

const FORBIDDEN_SQL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'PRAGMA', 'ATTACH',
  'DETACH', 'CREATE', 'REPLACE', 'TRUNCATE', 'VACUUM', 'REINDEX',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE', 'EXEC',
  'EXECUTE', 'EXPLAIN', 'UPSERT', 'INTO', 'SET'
];

/**
 * Validates whether an SQL query adheres strictly to the security sandbox:
 * 1. Single SELECT statement only.
 * 2. No multi-statements (no semicolons separating statements).
 * 3. No SQL comments (blocks prompt injection hiding payload in comments).
 * 4. No mutation / DDL / pragma keywords.
 * 5. All referenced tables MUST be explicitly permitted for the user's role.
 * 6. All referenced columns must pass role column safety tests.
 * 7. Adds a sensible safety LIMIT (default 50) if missing.
 */
export function validateSqlQuery(sql: string, role: UserRole): ValidationResult {
  const violations: string[] = [];

  if (!sql || typeof sql !== 'string') {
    return { isValid: false, blockedReason: 'Empty query received', violations: ['empty_query'] };
  }

  let cleaned = sql.trim();

  // Strip trailing semicolon if single statement
  if (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // 1. Check for multiple statements
  if (cleaned.includes(';')) {
    return {
      isValid: false,
      blockedReason: 'Multiple SQL statements are strictly forbidden.',
      violations: ['multiple_statements']
    };
  }

  // 2. Reject comments (-- or /* */) which are typical injection vectors
  if (/(--|\/\*|\*\/)/.test(cleaned)) {
    return {
      isValid: false,
      blockedReason: 'SQL comments are disabled for safety.',
      violations: ['sql_comments_detected']
    };
  }

  // 3. Must begin with SELECT or WITH (for CTEs leading to SELECT)
  const normalized = cleaned.replace(/\s+/g, ' ');
  if (!/^(\s*SELECT|\s*WITH)/i.test(normalized)) {
    return {
      isValid: false,
      blockedReason: 'Only read-only SELECT queries are permitted.',
      violations: ['non_select_statement']
    };
  }

  // 4. Reject forbidden mutation / DDL keywords
  const uppercaseQuery = normalized.toUpperCase();
  for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
    // Regex matching keyword as standalone word
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (keywordRegex.test(uppercaseQuery)) {
      // Allow INTO only if not preceded by SELECT ... INTO, but SQLite doesn't use SELECT INTO anyway
      return {
        isValid: false,
        blockedReason: `Dangerous SQL keyword '${keyword}' is prohibited by InstiPilot safety policy.`,
        violations: [`forbidden_keyword_${keyword.toLowerCase()}`]
      };
    }
  }

  // 5. Extract and validate tables
  // Matches tokens following FROM or JOIN
  const tableMatches = Array.from(uppercaseQuery.matchAll(/\b(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/gi));
  const foundTables = new Set<string>();

  for (const match of tableMatches) {
    if (match[1]) {
      foundTables.add(match[1].toLowerCase());
    }
  }

  const extractedTables = Array.from(foundTables);

  for (const table of extractedTables) {
    if (!isTableAllowed(role, table)) {
      violations.push(`unauthorized_table_${table}`);
      return {
        isValid: false,
        blockedReason: `Role '${role}' does not have permission to query table '${table}'. Access strictly blocked.`,
        violations,
        extractedTables
      };
    }
  }

  // 6. Check for role-forbidden column patterns
  // E.g., if Trainer attempts to read 'fee', 'payment', 'amount', 'emi'
  if (role === 'trainer') {
    const forbiddenFinancialTerms = ['amount', 'fee', 'total_fee', 'total_amount', 'down_payment', 'emi', 'payment', 'discount', 'paid_date'];
    for (const term of forbiddenFinancialTerms) {
      const termRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (termRegex.test(uppercaseQuery)) {
        violations.push(`unauthorized_column_${term}`);
        return {
          isValid: false,
          blockedReason: `Trainer role is restricted from accessing financial terms ('${term}'). Access blocked by policy.`,
          violations,
          extractedTables
        };
      }
    }
  }

  if (role === 'accounts') {
    const forbiddenPedagogicalTerms = ['check_in_time', 'ip_or_location', 'submission_url', 'topic_tags'];
    for (const term of forbiddenPedagogicalTerms) {
      const termRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (termRegex.test(uppercaseQuery)) {
        violations.push(`unauthorized_column_${term}`);
        return {
          isValid: false,
          blockedReason: `Accounts role is restricted from accessing granular biometric/pedagogical logs ('${term}'). Access blocked.`,
          violations,
          extractedTables
        };
      }
    }
  }

  // 7. Ensure a LIMIT clause exists to protect against memory exhaustion
  let finalSql = cleaned;
  if (!/\bLIMIT\s+\d+/i.test(finalSql)) {
    finalSql = `${finalSql} LIMIT 50`;
  }

  return {
    isValid: true,
    sanitizedSql: finalSql,
    extractedTables
  };
}

/**
 * Safely executes validated SQL inside a read-only SQLite database connection
 * with timeout and logs the audit trail.
 */
export async function executeSafeQuery(
  rawSql: string,
  user: { id: string; name: string; role: UserRole },
  originalPrompt?: string
): Promise<QueryExecutionResult> {
  const startTime = Date.now();
  const dbWritable = getDb();

  // 1. Validate
  const validation = validateSqlQuery(rawSql, user.role);

  if (!validation.isValid) {
    const duration = Date.now() - startTime;
    // Log blocked event to audit_log
    try {
      dbWritable.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `aud_blk_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user.id,
        user.name,
        user.role,
        'copilot_blocked',
        originalPrompt ? `${originalPrompt} [SQL: ${rawSql}]` : rawSql,
        validation.blockedReason || 'Blocked by security validator',
        'blocked'
      );
    } catch (e) {
      console.error('Failed to log blocked audit event:', e);
    }

    return {
      success: false,
      blocked: true,
      blockedReason: validation.blockedReason,
      error: validation.blockedReason,
      executionTimeMs: duration
    };
  }

  // 2. Execute on read-only connection
  try {
    const readOnlyDb = getReadOnlyDb();
    const statement = readOnlyDb.prepare(validation.sanitizedSql!);
    const rows = statement.all();
    const duration = Date.now() - startTime;

    // Log successful query to audit_log
    try {
      dbWritable.prepare(`
        INSERT INTO audit_log (id, user_id, user_name, role, action, query, result_summary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `aud_ok_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        user.id,
        user.name,
        user.role,
        'copilot_query',
        originalPrompt ? `${originalPrompt} [SQL: ${validation.sanitizedSql}]` : validation.sanitizedSql,
        `Returned ${rows.length} rows in ${duration}ms`,
        'success'
      );
    } catch (e) {
      console.error('Failed to write audit log:', e);
    }

    return {
      success: true,
      data: rows,
      rowCount: rows.length,
      executedSql: validation.sanitizedSql,
      executionTimeMs: duration
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: `Database execution error: ${err.message}`,
      executedSql: validation.sanitizedSql,
      executionTimeMs: duration
    };
  }
}
