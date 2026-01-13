import { createClient, Client } from "@libsql/client";

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL environment variable is not set");
    client = createClient({ url, authToken });
  }
  return client;
}

export async function initializeDb(): Promise<void> {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stablecoins (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stablecoin_id TEXT NOT NULL,
      price REAL NOT NULL,
      deviation_bps REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (stablecoin_id) REFERENCES stablecoins(id)
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_snapshots_time ON price_snapshots(stablecoin_id, timestamp DESC)`);
}

export async function seedStablecoins(stablecoins: Array<{ id: string; symbol: string; name: string }>): Promise<void> {
  const db = getDb();
  for (const coin of stablecoins) {
    await db.execute({ sql: `INSERT OR IGNORE INTO stablecoins (id, symbol, name) VALUES (?, ?, ?)`, args: [coin.id, coin.symbol, coin.name] });
  }
}

export async function insertPriceSnapshot(stablecoinId: string, price: number, deviationBps: number, timestamp: number): Promise<void> {
  const db = getDb();
  await db.execute({ sql: `INSERT INTO price_snapshots (stablecoin_id, price, deviation_bps, timestamp) VALUES (?, ?, ?, ?)`, args: [stablecoinId, price, deviationBps, timestamp] });
}

export async function getLatestPrices(): Promise<Array<{ id: string; symbol: string; name: string; price: number; deviation_bps: number; timestamp: number }>> {
  const db = getDb();
  const result = await db.execute(`
    SELECT s.id, s.symbol, s.name, p.price, p.deviation_bps, p.timestamp
    FROM stablecoins s
    LEFT JOIN (SELECT stablecoin_id, price, deviation_bps, timestamp, ROW_NUMBER() OVER (PARTITION BY stablecoin_id ORDER BY timestamp DESC) as rn FROM price_snapshots) p ON s.id = p.stablecoin_id AND p.rn = 1
    ORDER BY s.symbol
  `);
  return result.rows.map((row) => ({ id: row.id as string, symbol: row.symbol as string, name: row.name as string, price: row.price as number, deviation_bps: row.deviation_bps as number, timestamp: row.timestamp as number }));
}

export async function getHistoricalData(stablecoinIds: string[], fromTimestamp: number): Promise<Array<{ stablecoin_id: string; symbol: string; price: number; deviation_bps: number; timestamp: number }>> {
  const db = getDb();
  const placeholders = stablecoinIds.map(() => "?").join(",");
  const result = await db.execute({ sql: `SELECT p.stablecoin_id, s.symbol, p.price, p.deviation_bps, p.timestamp FROM price_snapshots p JOIN stablecoins s ON p.stablecoin_id = s.id WHERE p.stablecoin_id IN (${placeholders}) AND p.timestamp >= ? ORDER BY p.timestamp ASC`, args: [...stablecoinIds, fromTimestamp] });
  return result.rows.map((row) => ({ stablecoin_id: row.stablecoin_id as string, symbol: row.symbol as string, price: row.price as number, deviation_bps: row.deviation_bps as number, timestamp: row.timestamp as number }));
}

export async function getAllHistoricalData(stablecoinIds: string[]): Promise<Array<{ stablecoin_id: string; symbol: string; price: number; deviation_bps: number; timestamp: number }>> {
  const db = getDb();
  const placeholders = stablecoinIds.map(() => "?").join(",");
  const result = await db.execute({ sql: `SELECT p.stablecoin_id, s.symbol, p.price, p.deviation_bps, p.timestamp FROM price_snapshots p JOIN stablecoins s ON p.stablecoin_id = s.id WHERE p.stablecoin_id IN (${placeholders}) ORDER BY p.timestamp ASC`, args: stablecoinIds });
  return result.rows.map((row) => ({ stablecoin_id: row.stablecoin_id as string, symbol: row.symbol as string, price: row.price as number, deviation_bps: row.deviation_bps as number, timestamp: row.timestamp as number }));
}
