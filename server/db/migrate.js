import { sequelize, SquadJoinRequest } from '../models/index.js';
import { validateConfig } from '../config.js';
validateConfig();
try {
  await sequelize.authenticate();
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(20261012)', { transaction });
    await sequelize.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())',
      { transaction },
    );
    const [rows] = await sequelize.query(
      'SELECT version FROM schema_migrations WHERE version = 1',
      { transaction },
    );
    if (!rows.length) {
      await sequelize.sync({ transaction });
      await sequelize.query(
        `ALTER TABLE messages ADD CONSTRAINT message_exactly_one_destination CHECK (("receiverId" IS NOT NULL)::int + ("squadId" IS NOT NULL)::int = 1);
   ALTER TABLE users ADD CONSTRAINT valid_stats CHECK (age BETWEEN 13 AND 100 AND "kdRatio" >= 0 AND "winRate" BETWEEN 0 AND 100 AND "totalMatches" >= 0);
   CREATE OR REPLACE FUNCTION enforce_squad_capacity() RETURNS trigger AS $$
   BEGIN
    PERFORM id FROM squads WHERE id = NEW."squadId" FOR UPDATE;
    IF (SELECT count(*) FROM squad_members WHERE "squadId" = NEW."squadId" AND id <> NEW.id) >= 5 THEN
     RAISE EXCEPTION 'Squad is full (maximum five members)' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
   END; $$ LANGUAGE plpgsql;
   CREATE TRIGGER squad_capacity BEFORE INSERT OR UPDATE OF "squadId" ON squad_members FOR EACH ROW EXECUTE FUNCTION enforce_squad_capacity();`,
        { transaction },
      );
      await sequelize.query('INSERT INTO schema_migrations(version) VALUES (1)', { transaction });
    }
    const [second] = await sequelize.query(
      'SELECT version FROM schema_migrations WHERE version=2',
      { transaction },
    );
    if (!second.length) {
      await SquadJoinRequest.sync({ transaction });
      await sequelize.query('INSERT INTO schema_migrations(version) VALUES (2)', { transaction });
    }
  });
  console.log('Database migrations complete.');
} finally {
  await sequelize.close();
}
