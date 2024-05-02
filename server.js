import('node-fetch').then(fetch => {
  fetch.default()
})

const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "user", password: "password" });

app.use(express.json());

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  mdp: z.string(),
  email: z.string().email(),
});
const CreateUserSchema = UserSchema.omit({ id: true });

// const ModifUserSchema = z.object({
//   name: z.string().optional(),
//   mdp: z.string().optional(),
//   email: z.string().email().optional(),
// });

app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);

  if (result.success) {
    const { name, about, price } = result.data;

    const product = await sql`INSERT INTO products (name,about,price)
        VALUES (${name},${about},${price})
        RETURNING *
        `;

    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/products", async (req, res) => {
  const products = await sql`SELECT * FROM products`;
  res.send(products);
});

app.get("/products/:id", async (req, res) => {
  const products = await sql`SELECT * FROM products WHERE id=${req.params.id}`;
  if (products.length > 0) {
    res.send(products[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.get("/products/name/:name", async (req, res) => {
  const products =
    await sql`SELECT * FROM products WHERE name=${req.params.name}`;
  if (products.length > 0) {
    res.send(products);
  } else {
    res.status(404).send({ message: "No products found with that name" });
  }
});

app.get("/products/price/:price", async (req, res) => {
  const products =
    await sql`SELECT * FROM products WHERE price=${req.params.price}`;
  if (products.length > 0) {
    res.send(products);
  } else {
    res.status(404).send({ message: "No products found with that price" });
  }
});

app.get("/products/about/:about", async (req, res) => {
  const searchTerm = req.params.about;
  const products = await sql`
      SELECT * FROM products WHERE about ILIKE '%' || ${searchTerm} || '%'
    `;
  if (products.length > 0) {
    res.send(products);
  } else {
    res.status(404).send({
      message: `No products found with '${searchTerm}' in the about field`,
    });
  }
});

app.delete("/products/:id", async (req, res) => {
  const products =
    await sql`DELETE FROM products WHERE id=${req.params.id} RETURNING *`;
  if (products.length > 0) {
    res.send(products[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.post("/users", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { name, mdp, email } = result.data;
    const hashedPassword = hashPassword(mdp);

    const product = await sql`INSERT INTO users (name,mdp,email)
          VALUES (${name},${hashedPassword},${email})
          RETURNING *
          `;

    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/users", async (req, res) => {
  const products = await sql`SELECT * FROM users`;
  res.send(products);
});

app.get("/users/:id", async (req, res) => {
  const products = await sql`SELECT * FROM users WHERE id=${req.params.id}`;
  if (products.length > 0) {
    res.send(products[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const products =
    await sql`DELETE FROM users WHERE id=${req.params.id} RETURNING *`;
  if (products.length > 0) {
    res.send(products[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.put("/users/:id", async (req, res) => {
  const user =
    await sql`DELETE FROM users WHERE id=${req.params.id} RETURNING *`;

  if (user.length > 0) {
    const result = await CreateUserSchema.safeParse(req.body);

    if (result.success) {
      const { name, mdp, email } = result.data;
      const hashedPassword = hashPassword(mdp);

      const product = await sql`INSERT INTO users (name,mdp,email)
                VALUES (${name},${hashedPassword},${email})
                RETURNING *
                `;

      res.send(product[0]);
    } else {
      res.status(400).send(result);
    }
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

// app.patch("/users/:id", async (req, res) => {
//     const userId = req.params.id;
//     const result = await ModifUserSchema.safeParse(req.body);

//     if (!result.success) {
//       res.status(400).send(result);
//       return;
//     }

//     const { name, mdp, email } = result.data;

//     // Construct the SQL query based on the fields provided in the request body
//     let query = "UPDATE users SET ";
//     const values = [];

//     if (name !== undefined) {
//       query += "name = $" + (values.length + 1);
//       values.push(name);
//     }

//     if (mdp !== undefined) {
//       const hashedPassword = hashPassword(mdp);
//       if (values.length > 0) query += ", ";
//       query += "mdp = $" + (values.length + 1);
//       values.push(hashedPassword);
//     }

//     if (email !== undefined) {
//       if (values.length > 0) query += ", ";
//       query += "email = $" + (values.length + 1);
//       values.push(email);
//     }

//     query += " WHERE id = $" + (values.length + 1) + " RETURNING *";

//     try {
//       const updatedUser = await sql.query(query, ...values, userId);

//       if (updatedUser.length > 0) {
//         res.send(updatedUser[0]);
//       } else {
//         res.status(404).send({ message: "User not found" });
//       }
//     } catch (error) {
//       console.error("Error updating user:", error);
//       res.status(500).send({ message: "Internal Server Error" });
//     }
//   });

app.post("/orders", async (req, res) => {
  const { user_id, product_price } = req.body;
  const tva = product_price * 0.2;
  const createdOrder = await sql`
      INSERT INTO orders (user_id, product_price, tva)
      VALUES (${user_id}, ${product_price}, ${tva})
      RETURNING *`;
  res.send(createdOrder[0]);
});

app.get("/orders", async (req, res) => {
  const orders = await sql`SELECT * FROM orders`;
  res.send(orders);
});

app.get("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (order.length > 0) {
    res.send(order[0]);
  } else {
    res.status(404).send({ message: "Order not found" });
  }
});

app.put("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const { user_id, product_price } = req.body;
  const tva = product_price * 0.2;
  const updatedOrder = await sql`
      UPDATE orders
      SET user_id = ${user_id}, product_price = ${product_price}, tva = ${tva}, updated_at = NOW()
      WHERE id = ${orderId}
      RETURNING *`;
  if (updatedOrder.length > 0) {
    res.send(updatedOrder[0]);
  } else {
    res.status(404).send({ message: "Order not found" });
  }
});

app.delete("/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const deletedOrder = await sql`
      DELETE FROM orders
      WHERE id = ${orderId}
      RETURNING *`;
  if (deletedOrder.length > 0) {
    res.send(deletedOrder[0]);
  } else {
    res.status(404).send({ message: "Order not found" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

function hashPassword(password) {
  const hash = crypto.createHash("sha512");
  hash.update(password);
  return hash.digest("hex");
}
