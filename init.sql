CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    about VARCHAR(500),
    price FLOAT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500),
    mdp VARCHAR(500),
    email VARCHAR(500)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_price NUMERIC,
    tva NUMERIC,
    payment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO products (name, about, price) VALUES
    ('My First Game', 'This is an awsome game !', 60);