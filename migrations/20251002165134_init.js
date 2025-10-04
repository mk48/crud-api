/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  //await knex.schema.dropTableIfExists("products");
  return knex.schema.createTable("products", function (table) {
    table.uuid("id").primary();

    table.string("product_name", 100).notNullable();
    table.string("department", 100);
    table.string("category", 100);
    table.string("material", 100);
    table.string("color", 50);
    table.text("description");
    table.string("size", 30);
    table.float("price").notNullable();

    //Audit
    table.timestamp("created_at");
    table.string("created_by");
    table.timestamp("updated_at");
    table.string("updated_by");
    table.timestamp("deleted_at");
    table.string("deleted_by");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
