
import { Pool } from 'pg'; // Import Pool from the 'pg' library

//IT IS A PLACEHOLDER, GIO FEEL FREE TO CHANGE IT 

let pool: Pool;

export const initializeDb = async () => {
    try {
      // postgreSQL rules
        pool = new Pool({
            user: process.env.DB_USER || 'pgadmin',             // PostgreSQL username
            host: process.env.DB_HOST || 'localhost',           // Database host
            database: process.env.DB_NAME || 'fake_api_db',     // Database name
            password: process.env.DB_PASSWORD || 'se',          // Database password
            port: parseInt(process.env.DB_PORT || '5432', 10),  // Database port
            max: 20, 
            idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
            connectionTimeoutMillis: 2000, // How long to wait for a connection to be established
        });

        // Test the connection
        await pool.connect();
        console.log('Connected to PostgreSQL database.');

        // Create the 'fake_api_rules' table if it does not exist.
        // This table stores the configuration for each fake API endpoint.
        // Note: UNIQUE constraint syntax is standard SQL.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fake_api_rules (
                id SERIAL PRIMARY KEY, -- SERIAL for auto-incrementing integer in PostgreSQL
                path TEXT NOT NULL,
                method TEXT NOT NULL,
                statusCode INTEGER NOT NULL,
                contentType TEXT NOT NULL,
                responseBody TEXT NOT NULL,
                UNIQUE(path, method) -- Ensures that no two rules have the same path and method combination
            );
        `);
        console.log('`fake_api_rules` table ensured.');

        // You can add more tables or initial data here if needed.

    } catch (error) {
        console.error('Failed to initialize PostgreSQL database:', error);
        // In a real application, you might want to exit the process or handle this more gracefully.
        process.exit(1);
    }
};

/**
 * Exports the initialized PostgreSQL connection pool instance.
 * This allows other modules (like route handlers or the fake API manager) to interact with the database.
 * Instead of 'db', it's now 'pool' to reflect the PostgreSQL client library's common naming convention.
 */
export { pool };

