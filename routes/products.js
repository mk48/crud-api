var express = require("express");
var db = require("../db/knex");
const { v4: uuidv4 } = require("uuid");

var router = express.Router();

const userId = "0b14e650-cf35-4edd-a7cb-2f2520503191";

//---------------- Meta - cols ------------------
router.get("/meta-data", async function (req, res, next) {
  const columns = [
    { name: "id", dataType: "uuid", isNullable: false },
    { name: "product_name", dataType: "string", isNullable: false },
    { name: "department", dataType: "string", isNullable: true },
    { name: "category", dataType: "string", isNullable: true },
    { name: "material", dataType: "string", isNullable: true },
    { name: "color", dataType: "string", isNullable: true },
    { name: "description", dataType: "string", isNullable: true },
    { name: "size", dataType: "string", isNullable: true },
    { name: "price", dataType: "number", isNullable: false },
    { name: "created_at", dataType: "date", isNullable: false },
    { name: "created_by", dataType: "string", isNullable: false },
    { name: "updated_at", dataType: "date", isNullable: false },
    { name: "updated_by", dataType: "string", isNullable: false },
    { name: "deleted_at", dataType: "date", isNullable: false },
    { name: "deleted_by", dataType: "string", isNullable: false },
  ];

  const result = {
    columns: columns,
    sortableColumns: [
      "id",
      "productName",
      "department",
      "category",
      "material",
      "color",
      "description",
      "size",
      "price",
      "actionAt",
      "actionBy",
    ],
  };

  res.json(result);
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

  let dataQuery = db("products").select("*");

  //filter
  if (searchText) {
    dataQuery.where("product_name", "like", `%${searchText}%`);
  }

  // include deleted
  if (!includeDeleted || includeDeleted.toLowerCase() !== "true") {
    dataQuery.andWhere("deleted_at", null);
  }

  // Count query for total records
  const countQuery = dataQuery.clone().clearSelect().count({ count: "*" });

  let [orderBy, orderDir] = (sortBy || "actionAt:desc").split(":");
  orderDir = orderDir && orderDir.toLowerCase() === "asc" ? "asc" : "desc";

  if (orderBy === "actionBy") {
    dataQuery.orderByRaw("COALESCE(deleted_by, updated_by, created_by) " + orderDir);
  } else if (orderBy === "actionAt") {
    dataQuery.orderByRaw("COALESCE(deleted_at, updated_at, created_at) " + orderDir);
  } else {
    dataQuery.orderBy(dtoToEntity[orderBy], orderDir);
  }

  //limit
  const offset = pageIndex * recordsPerPage;
  dataQuery.limit(recordsPerPage).offset(offset);

  const [data, [{ count }]] = await Promise.all([dataQuery, countQuery]);

  const result = {
    pageIndex: Number(pageIndex),
    recordsPerPage: Number(recordsPerPage),
    totalRecords: Number(count),
    records: toDtoList(data),
  };

  res.json(result);
});

//---------------- Advanced query ------------------
/// <summary>
/// Performs an advanced query on Products with pagination.
/// </summary>
/// <param name="pageIndex">Zero-based page index (0-999)</param>
/// <param name="recordsPerPage">Number of records per page (1-200)</param>
/// <param name="whereCondition">The Parameterized SQL WHERE clause for filtering the results. Example: ("column_name_1" = ? and "column_name_2" like ?) </param>
/// <param name="whereConditionParametersJson">A JSON array containing all parameters value for the WHERE clause. Example: ["val1","%val2%"] </param>
/// <param name="sortBy">Optional field name to sort results by. Example:- colname:asc OR colname:desc (Use /meta-data to know valid sortable column names)</param>
/// <returns>A paginated list of Product entries</returns>
router.get("/query", async function (req, res, next) {
  const { pageIndex, recordsPerPage, whereCondition, whereConditionParametersJson, sortBy } = req.query;

  const disallowedKeywords = ["DELETE", "DROP", "UPDATE", "INSERT"];
  const allowedKeywords = ["deleted_at", "deleted_by", "updated_at", "updated_by"];

  if (!whereCondition || typeof whereCondition !== "string") {
    res.status(400).json({ message: "whereCondition is required and must be a string." });
    return;
  }

  // Remove allowed keywords, then check for disallowed keywords
  let whereConditionWithoutAllowed = whereCondition;
  for (const allowed of allowedKeywords) {
    const regex = new RegExp(allowed, "gi");
    whereConditionWithoutAllowed = whereConditionWithoutAllowed.replace(regex, "");
  }

  // Check for disallowed SQL keywords
  for (const disallowed of disallowedKeywords) {
    const regex = new RegExp(`\\b${disallowed}\\b`, "i"); // word boundary, case-insensitive
    if (regex.test(whereConditionWithoutAllowed)) {
      res
        .status(400)
        .json({ message: `Invalid where condition. It should not contain ${disallowedKeywords.join(", ")}.` });
      return;
    }
  }

  // Step 3: Sanitize the condition (remove dangerous characters)
  const sanitizedWhereCondition = whereCondition
    .replace(/[;'\"\\]/g, "") // remove ; ' " \
    .trim();

  let dataQuery = db("products").select("*");

  //filter
  if (sanitizedWhereCondition) {
    // parameter is automatically sanitized by Knex
    // only the condition string is sanitized above
    console.log(sanitizedWhereCondition);
    console.log(whereConditionParametersJson);
    dataQuery.whereRaw(sanitizedWhereCondition, JSON.parse(whereConditionParametersJson));
  }

  // Count query for total records
  const countQuery = dataQuery.clone().clearSelect().count({ count: "*" });

  let [orderBy, orderDir] = (sortBy || "actionAt:desc").split(":");
  orderDir = orderDir && orderDir.toLowerCase() === "asc" ? "asc" : "desc";

  if (orderBy === "actionBy") {
    dataQuery.orderByRaw("COALESCE(deleted_by, updated_by, created_by) " + orderDir);
  } else if (orderBy === "actionAt") {
    dataQuery.orderByRaw("COALESCE(deleted_at, updated_at, created_at) " + orderDir);
  } else {
    dataQuery.orderBy(dtoToEntity[orderBy], orderDir);
  }

  //limit
  const offset = pageIndex * recordsPerPage;
  dataQuery.limit(recordsPerPage).offset(offset);

  const [data, [{ count }]] = await Promise.all([dataQuery, countQuery]);

  const result = {
    pageIndex: Number(pageIndex),
    recordsPerPage: Number(recordsPerPage),
    totalRecords: Number(count),
    records: toDtoList(data),
  };

  res.json(result);
});

//---------------- Get id-name ------------------
router.get("/id-name", async function (req, res, next) {
  const { pageIndex = 0, recordsPerPage = 50, searchText } = req.query;

  let dataQuery = db("products").select("id", "product_name");

  //filter
  if (searchText) {
    dataQuery.where("product_name", "like", `%${searchText}%`);
  }

  dataQuery.andWhere("deleted_at", null).orderBy("product_name", "asc");

  //limit
  const offset = pageIndex * recordsPerPage;
  const data = await dataQuery.limit(recordsPerPage).offset(offset);

  const result = {
    pageIndex: Number(pageIndex),
    recordsPerPage: Number(recordsPerPage),
    totalRecords: recordsPerPage,
    records: toDtoList(data),
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
