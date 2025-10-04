var express = require("express");
var db = require("../db/knex");
const { v4: uuidv4 } = require("uuid");

var router = express.Router();

const userId = "0b14e650-cf35-4edd-a7cb-2f2520503191";

//---------------- Meta - cols ------------------
router.get("/meta-data", async function (req, res, next) {
  const data = [
    { name: "id", dataType: "uuid", isNullable: false },
    { name: "product_name", dataType: "string", isNullable: false },
    { name: "department", dataType: "string", isNullable: true },
    { name: "category", dataType: "string", isNullable: true },
    { name: "material", dataType: "string", isNullable: true },
    { name: "color", dataType: "string", isNullable: true },
    { name: "description", dataType: "string", isNullable: true },
    { name: "size", dataType: "string", isNullable: true },
    { name: "created_at", dataType: "date", isNullable: false },
    { name: "created_by", dataType: "string", isNullable: false },
    { name: "updated_at", dataType: "date", isNullable: false },
    { name: "updated_by", dataType: "string", isNullable: false },
    { name: "deleted_at", dataType: "date", isNullable: false },
    { name: "deleted_by", dataType: "string", isNullable: false },
  ];
  res.json(data);
});

//---------------- List all ------------------
/// <summary>
/// Retrieves a paginated list of Product entries with optional filtering and sorting
/// </summary>
/// <param name="pageIndex">Zero-based page index (0-999)</param>
/// <param name="recordsPerPage">Number of records per page (1-200)</param>
/// <param name="searchText">Optional search text to filter results. Filter by Name</param>
/// <param name="sortBy">Optional field name to sort results by. Example:- colname:asc OR colname:desc (Use /meta-data to know valid sortable column names)</param>
/// <param name="includeDeleted">Optional flag to include soft-deleted entries</param>
/// <returns>A paginated list of Country entries</returns>
router.get("/", async function (req, res, next) {
  const { pageIndex, recordsPerPage, searchText, sortBy, includeDeleted } = req.query;
  const offset = pageIndex * recordsPerPage;
  let query = db("products").select("*");
  if (searchText) {
    query.where("product_name", "like", `%${searchText}%`);
  }

  if (!includeDeleted || includeDeleted.toLowerCase() !== "true") {
    query.andWhere("deleted_at", null);
  }

  // Count query for total records
  const countQuery = query.clone();
  const [{ count }] = await countQuery.count({ count: "*" });

  let [orderBy, orderDir] = (sortBy || "actionAt:desc").split(":");
  orderDir = orderDir && orderDir.toLowerCase() === "asc" ? "asc" : "desc";

  if (orderBy === "actionBy") {
    query.orderByRaw("COALESCE(deleted_by, updated_by, created_by) " + orderDir);
  } else if (orderBy === "actionAt") {
    query.orderByRaw("COALESCE(deleted_at, updated_at, created_at) " + orderDir);
  } else {
    const orderByEntity = dtoToEntity[orderBy];
    query.orderBy(orderByEntity, orderDir);
  }
  const rows = await query.limit(recordsPerPage).offset(offset);

  const result = {
    pageIndex: Number(pageIndex),
    recordsPerPage: Number(recordsPerPage),
    totalRecords: Number(count),
    records: toDtoList(rows),
  };

  res.json(result);
});

//---------------- Get one ------------------
router.get("/:id", async function (req, res, next) {
  const row = await db("products").select("*").where("id", req.params.id).first();
  res.json(toDto(row));
});

//---------------- Get Audit history ------------------
router.get("/:id/audit-history", async function (req, res, next) {
  const rows = await db("audit_history").select("*").where("source_table_row_id", req.params.id);

  const result = rows.map((r) => JSON.parse(r.data));

  res.json(toDtoList(result));
});

//---------------- Create one ------------------
router.post("/", async function (req, res, next) {
  const newId = uuidv4();
  const newRow = {
    id: newId,
    product_name: req.body.productName,
    department: req.body.department,
    category: req.body.category,
    material: req.body.material,
    color: req.body.color,
    description: req.body.description,
    size: req.body.size,
    price: req.body.price,
    created_at: new Date(),
    created_by: userId,
  };

  await db("products").insert(newRow);
  const newProduct = await db("products").select("*").where("id", newId).first();

  //add the new product into audit_history table
  await db("audit_history").insert({
    id: uuidv4(),
    source_table_row_id: newId,
    data: JSON.stringify(newProduct),
  });

  res.status(201).json(toDto(newProduct));
});

//---------------- Update one ------------------
router.put("/:id", async function (req, res, next) {
  const updateRow = {
    product_name: req.body.productName,
    department: req.body.department,
    category: req.body.category,
    material: req.body.material,
    color: req.body.color,
    description: req.body.description,
    size: req.body.size,
    price: req.body.price,
    updated_at: new Date(),
    updated_by: userId,
  };

  await db("products").where("id", req.params.id).update(updateRow);

  const updatedProduct = await db("products").select("*").where("id", req.params.id).first();

  //add the new updated product into audit_history table
  await db("audit_history").insert({
    id: uuidv4(),
    source_table_row_id: req.params.id,
    data: JSON.stringify(updatedProduct),
  });

  res.json(toDto(updatedProduct));
});

//---------------- Soft delete ------------------
router.delete("/:id", async function (req, res, next) {
  await db("products").where("id", req.params.id).update({ deleted_at: new Date(), deleted_by: userId });

  const prod = await db("products").select("*").where("id", req.params.id).first();

  //add the new updated product into audit_history table
  await db("audit_history").insert({
    id: uuidv4(),
    source_table_row_id: req.params.id,
    data: JSON.stringify(prod),
  });

  res.status(204).end();
});

//---------------------------- Private func ------------------------------
const dtoToEntity = {
  productName: "product_name",
  department: "department",
  category: "category",
  material: "material",
  color: "color",
  description: "description",
  size: "size",
  price: "price",
};

const toDtoList = (rows) => {
  return rows.map((row) => toDto(row));
};

const toDto = (row) => {
  return {
    id: row.id,
    productName: row.product_name,
    department: row.department,
    category: row.category,
    material: row.material,
    color: row.color,
    description: row.description,
    size: row.size,
    price: row.price,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    deletedBy: row.deleted_by,
  };
};

module.exports = router;
