# Inventory & Order Management System

A production-ready full-stack inventory and order management web app for managing products, customers, orders, and stock movement. The React frontend talks to a FastAPI backend, the backend persists data in PostgreSQL through SQLAlchemy, and the full stack runs with Docker Compose.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Lucide icons
- Backend: Python, FastAPI, SQLAlchemy ORM, Pydantic validation
- Database: PostgreSQL
- Migrations: Alembic initial schema
- Containers: Docker, Docker Compose, Nginx frontend image

## Features

- Dashboard with total products, customers, orders, and low-stock products
- Product create, read, update, delete with unique SKU validation
- Customer create, read, delete with unique email and email format validation
- Order creation for one or more products
- Automatic backend total calculation
- Automatic inventory reduction on order creation
- Insufficient stock protection with clear API/UI errors
- Order details page
- Order cancellation through `DELETE /orders/{id}` that restores product stock before deleting the order
- Responsive UI with loading, empty, success, and error states
- Seed data command for sample products and customers

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | API welcome message |
| GET | `/health` | Health check |
| POST | `/products` | Create product |
| GET | `/products` | List products |
| GET | `/products/{id}` | Get product |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Delete product |
| POST | `/customers` | Create customer |
| GET | `/customers` | List customers |
| GET | `/customers/{id}` | Get customer |
| DELETE | `/customers/{id}` | Delete customer |
| POST | `/orders` | Create order |
| GET | `/orders` | List orders |
| GET | `/orders/{id}` | Get order details |
| DELETE | `/orders/{id}` | Cancel order, restore stock, delete order |

## Database Models

- Product: `id`, `name`, `sku`, `price`, `quantity_in_stock`, `created_at`, `updated_at`
- Customer: `id`, `full_name`, `email`, `phone`, `created_at`
- Order: `id`, `customer_id`, `total_amount`, `created_at`
- OrderItem: `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `line_total`

Relationships:

- A customer has many orders.
- An order has many order items.
- A product can appear in many order items.

## Business Rules

- SKU must be unique.
- Product price and inventory quantity cannot be negative.
- Email must be unique and valid.
- Orders must reference an existing customer.
- Orders must include at least one product item.
- Ordered quantity must be positive.
- Orders fail when requested quantity is greater than available stock.
- The backend calculates order totals; the frontend never trusts a client-only total.
- Creating an order reduces inventory.
- Cancelling an order with `DELETE /orders/{id}` restores inventory and removes the order.
- Products and customers that are referenced by existing orders cannot be deleted until related orders are cancelled.

## Environment Variables

Backend:

```env
DATABASE_URL=
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=inventory_order_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

Frontend:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Root Docker Compose variables are shown in `.env.example`. Copy it to `.env` and change values for your machine or deployment:

```bash
cp .env.example .env
```

## Local Setup Without Docker

Prerequisites: Python 3.12, Node.js 20 or newer, PostgreSQL.

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Set `DATABASE_URL` or the `POSTGRES_*` variables in `backend/.env` before starting the API.

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`.

If a local Windows npm shim reports a bin remapping error, run Vite directly:

```bash
node ./node_modules/vite/bin/vite.js --host 0.0.0.0
```

## Local Setup With Docker Compose

From the repository root:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

PostgreSQL data is stored in the named Docker volume `postgres_data`.

Optional seed data:

```bash
docker compose exec backend python -m app.seed
```

Stop the stack:

```bash
docker compose down
```

Remove the database volume:

```bash
docker compose down -v
```

## Alembic Migrations

An initial Alembic migration is included. For production deployments, run migrations during release:

```bash
cd backend
alembic upgrade head
```

The app also creates missing tables on startup so `docker compose up --build` works for local assessment review.

## Docker Build Commands

Backend:

```bash
docker build -t inventory-order-backend:latest ./backend
```

Frontend:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t inventory-order-frontend:latest ./frontend
```

Local frontend build:

```bash
cd frontend
npm run build
```

Equivalent direct build command:

```bash
node ./node_modules/vite/bin/vite.js build
```

## Docker Hub Push Commands

```bash
docker login
docker tag inventory-order-backend:latest YOUR_DOCKERHUB_USERNAME/inventory-order-backend:latest
docker push YOUR_DOCKERHUB_USERNAME/inventory-order-backend:latest
```

Backend Docker Hub Image Link:

```text
https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/inventory-order-backend
```

## Frontend Deployment

Vercel:

1. Import the GitHub repository.
2. Set root directory to `frontend`.
3. Set build command to `npm run build`.
4. Set output directory to `dist`.
5. Add `VITE_API_BASE_URL` with your hosted backend URL.
6. Deploy.

Netlify:

1. Import the GitHub repository.
2. Set base directory to `frontend`.
3. Set build command to `npm run build`.
4. Set publish directory to `frontend/dist`.
5. Add `VITE_API_BASE_URL` with your hosted backend URL.
6. Deploy.

## Backend Deployment

Render:

1. Create a PostgreSQL database.
2. Create a Web Service from the GitHub repository or Docker image.
3. Set root directory to `backend` when deploying from source.
4. Use start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Add `DATABASE_URL` from the hosted PostgreSQL database.
6. Add `CORS_ORIGINS` with your frontend URL.

Railway:

1. Create a new project with PostgreSQL.
2. Deploy the backend service from the GitHub repository or Docker image.
3. Add `DATABASE_URL` and `CORS_ORIGINS`.
4. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` if deploying from source.

Fly.io:

1. Build and push the backend Docker image or run `fly launch` from `backend`.
2. Attach a managed PostgreSQL database.
3. Set `DATABASE_URL` and `CORS_ORIGINS` as secrets.
4. Deploy the app.

## Testing Instructions

Backend automated tests:

```bash
cd backend
pip install -r requirements.txt
pytest
```

Manual smoke test:

1. Run `docker compose up --build`.
2. Open `http://localhost:8080`.
3. Create a product with stock.
4. Create a customer.
5. Create an order for that customer and product.
6. Confirm product quantity decreases.
7. Cancel the order.
8. Confirm product quantity is restored.
9. Try to order more than available stock and confirm a clear error appears.

## Submission Links

- GitHub Repository Link: https://github.com/vkk-rawat/assignment-v1
- Backend Docker Hub Image Link:
- Frontend Hosted URL:
- Backend API Hosted URL:
