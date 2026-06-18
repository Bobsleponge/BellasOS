import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://bellasos:bellasos@localhost:5432/bellasos',
});

const config = await pool.query(
  "SELECT namespace, key, is_secret, value FROM core.config WHERE namespace = 'module:bellasos.finance-tracker'",
);
console.log('config:', JSON.stringify(config.rows, null, 2));

const integrations = await pool.query(
  "SELECT module_id, platform, account_name, status FROM core.integrations WHERE module_id = 'bellasos.finance-tracker'",
);
console.log('integrations:', JSON.stringify(integrations.rows, null, 2));

await pool.end();
