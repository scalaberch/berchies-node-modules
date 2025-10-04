
const initializeMigrationTable = async () => {
  const sqlString = `
    CREATE TABLE IF NOT EXISTS database_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_id VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      batch INT NULL,
      created_by VARCHAR(255) NULL
    );
  `;
};
