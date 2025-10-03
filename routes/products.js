var express = require("express");
var db = require("../db/knex");

var router = express.Router();

const userId = "0b14e650-cf35-4edd-a7cb-2f2520503191";

//---------------- List all ------------------
router.get("/", async function (req, res, next) {
  const rows = await db("products").select("*");
  res.json(rows);
});

//---------------- Get one ------------------
router.get("/:id", async function (req, res, next) {
  const row = await db("products").select("*").where("id", req.params.id).first();
  res.json(row);
});

//---------------- Create one ------------------
router.post("/", async function (req, res, next) {
  const { product_name, category, size, price } = req.body;
  const [id] = await db("products")
    .insert({ product_name, category, size, price, created_at: new Date(), created_by: userId })
    .returning("id");
  const newProduct = await db("products").select("*").where("id", id).first();
  res.status(201).json(newProduct);
});

//---------------- Update one ------------------
router.put("/:id", async function (req, res, next) {
  const { product_name, category, size, price } = req.body;
  await db("products")
    .where("id", req.params.id)
    .update({ product_name, category, size, price, updated_at: new Date(), updated_by: userId });
  const updatedProduct = await db("products").select("*").where("id", req.params.id).first();
  res.json(updatedProduct);
});

//---------------- Soft delete ------------------
router.delete("/:id", async function (req, res, next) {
  await db("products").where("id", req.params.id).update({ deleted_at: new Date(), deleted_by: userId });
  res.status(204).end();
});

module.exports = router;
