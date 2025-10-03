const { faker } = require("@faker-js/faker");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("products").del();

  const data = [];

  // generate fake data for products table insert 10 rows
  for (let i = 0; i < 10; i++) {
    data.push({
      id: faker.string.uuid(),
      product_name: faker.commerce.productName(),
      category: faker.commerce.productAdjective(),
      size: faker.helpers.arrayElement(["S", "M", "L", "XL"]),
      price: parseFloat(faker.commerce.price()),
      created_at: faker.date.past({ years: 1 }),
      created_by: "0b14e650-cf35-4edd-a7cb-2f2520503191",
    });
  }

  await knex("products").insert(data);
};
