/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("audit_history", function (table) {
    table.uuid("id").primary();

    table.uuid("source_table_row_id", 100).notNullable();
    table.text("data");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
