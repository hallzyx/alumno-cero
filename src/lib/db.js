// Server-only MySQL/MariaDB access. Creates the database and tables on first use.
import mysql from "mysql2/promise";

const env = () => ({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 33065),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "alumno_cero",
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS learners (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(24) NOT NULL,
    nickname VARCHAR(40) NOT NULL,
    avatar VARCHAR(16) NOT NULL DEFAULT 'zero',
    grade VARCHAR(16) NULL,
    pass_hash VARCHAR(200) NOT NULL,
    xp INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_username (username)
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    learner_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_learner (learner_id),
    CONSTRAINT fk_auth_learner FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
  // One row per learner+topic journey. `state` is the live UI snapshot (resume where you left off).
  `CREATE TABLE IF NOT EXISTS learning_sessions (
    id CHAR(36) PRIMARY KEY,
    learner_id CHAR(36) NOT NULL,
    topic_id VARCHAR(40) NOT NULL,
    goal VARCHAR(20) NULL,
    level VARCHAR(20) NULL,
    input_mode VARCHAR(10) NULL,
    frictions JSON NULL,
    status ENUM('in_progress','mastered') NOT NULL DEFAULT 'in_progress',
    attempts INT NOT NULL DEFAULT 0,
    state JSON NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    mastered_at DATETIME NULL,
    INDEX idx_learner (learner_id, updated_at),
    CONSTRAINT fk_ls_learner FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    learner_id CHAR(36) NOT NULL,
    topic_id VARCHAR(40) NOT NULL,
    attempt_no INT NOT NULL,
    variant_id VARCHAR(10) NULL,
    explanation TEXT NOT NULL,
    analysis JSON NULL,
    exam JSON NULL,
    passed TINYINT(1) NOT NULL,
    ai_used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attempt (session_id, attempt_no),
    INDEX idx_att_learner (learner_id, created_at),
    CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS mastery_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    learner_id CHAR(36) NOT NULL,
    topic_id VARCHAR(40) NOT NULL,
    explanation TEXT NOT NULL,
    concepts JSON NOT NULL,
    attempts INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_card (session_id),
    INDEX idx_card_learner (learner_id, created_at),
    CONSTRAINT fk_card_session FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
  // Gamification: every XP gain is logged (the unique key makes awards idempotent) and badges are earned once.
  `CREATE TABLE IF NOT EXISTS xp_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    learner_id CHAR(36) NOT NULL,
    reason VARCHAR(40) NOT NULL,
    ref VARCHAR(80) NOT NULL,
    amount INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_xp (learner_id, reason, ref),
    CONSTRAINT fk_xp_learner FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS badges (
    learner_id CHAR(36) NOT NULL,
    code VARCHAR(40) NOT NULL,
    earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (learner_id, code),
    CONSTRAINT fk_badge_learner FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`,
];

const g = globalThis;

async function init() {
  const { database, ...conn } = env();
  const boot = await mysql.createConnection(conn);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await boot.end();
  const pool = mysql.createPool({ ...conn, database, connectionLimit: 6, charset: "utf8mb4", timezone: "Z" });
  pool.pool.on("connection", (c) => c.query("SET time_zone = '+00:00'")); // store everything in UTC
  for (const ddl of SCHEMA) await pool.query(ddl);
  await migrate(pool, database);
  return pool;
}

async function hasColumn(pool, database, table, column) {
  const [r] = await pool.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?", [database, table, column]);
  return r.length > 0;
}

// Additive migrations (portable: no "ADD COLUMN IF NOT EXISTS", which MySQL lacks).
async function migrate(pool, database) {
  const add = async (table, column, ddl) => {
    if (!(await hasColumn(pool, database, table, column))) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  };
  await add("learners", "plan", "VARCHAR(16) NULL");            // account plan: familia | familia-plus | colegio (null = must choose)
  await add("learners", "owner_id", "CHAR(36) NULL");           // child/student profiles point to the paying account
  await add("learners", "classroom_id", "CHAR(36) NULL");
  await add("auth_sessions", "active_learner_id", "CHAR(36) NULL"); // which profile is studying right now
  await pool.query(`CREATE TABLE IF NOT EXISTS classrooms (
    id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    name VARCHAR(60) NOT NULL,
    grade VARCHAR(16) NULL,
    code CHAR(6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class_code (code),
    INDEX idx_class_owner (owner_id),
    CONSTRAINT fk_class_owner FOREIGN KEY (owner_id) REFERENCES learners(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);
}

/** Shared pool (survives Next.js dev reloads). Rejects if the database is unreachable. */
export function db() {
  if (!g.__alumnoCeroPool) {
    g.__alumnoCeroPool = init().catch((e) => { g.__alumnoCeroPool = null; throw e; });
  }
  return g.__alumnoCeroPool;
}

const ID = /^[0-9a-f-]{36}$/i;
export const isId = (s) => typeof s === "string" && ID.test(s);
export const json = (v) => (v == null ? null : JSON.stringify(v));
export const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
