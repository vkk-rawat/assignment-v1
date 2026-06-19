import os

os.environ["DATABASE_URL"] = "sqlite:///./test_inventory.db"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_order_reduces_inventory_and_delete_restores_stock():
    product_response = client.post(
        "/products",
        json={
            "name": "Scanner",
            "sku": "SCN-TST",
            "price": "25.00",
            "quantity_in_stock": 10,
        },
    )
    customer_response = client.post(
        "/customers",
        json={
            "full_name": "Test Customer",
            "email": "test.customer@example.com",
            "phone": "+1 555 9000",
        },
    )

    assert product_response.status_code == 201
    assert customer_response.status_code == 201

    product_id = product_response.json()["id"]
    customer_id = customer_response.json()["id"]

    order_response = client.post(
        "/orders",
        json={
            "customer_id": customer_id,
            "items": [{"product_id": product_id, "quantity": 3}],
        },
    )

    assert order_response.status_code == 201
    assert order_response.json()["total_amount"] == "75.00"
    assert client.get(f"/products/{product_id}").json()["quantity_in_stock"] == 7

    delete_response = client.delete(f"/orders/{order_response.json()['id']}")

    assert delete_response.status_code == 204
    assert client.get(f"/products/{product_id}").json()["quantity_in_stock"] == 10


def test_order_fails_when_stock_is_insufficient():
    product_response = client.post(
        "/products",
        json={
            "name": "Printer",
            "sku": "PRN-TST",
            "price": "99.00",
            "quantity_in_stock": 1,
        },
    )
    customer_response = client.post(
        "/customers",
        json={
            "full_name": "Another Customer",
            "email": "another.customer@example.com",
            "phone": None,
        },
    )

    response = client.post(
        "/orders",
        json={
            "customer_id": customer_response.json()["id"],
            "items": [
                {
                    "product_id": product_response.json()["id"],
                    "quantity": 2,
                }
            ],
        },
    )

    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


def test_duplicate_sku_and_email_return_clear_400_errors():
    first_product = client.post(
        "/products",
        json={
            "name": "Scanner A",
            "sku": "DUP-001",
            "price": "10.00",
            "quantity_in_stock": 2,
        },
    )
    duplicate_product = client.post(
        "/products",
        json={
            "name": "Scanner B",
            "sku": "DUP-001",
            "price": "12.00",
            "quantity_in_stock": 3,
        },
    )
    first_customer = client.post(
        "/customers",
        json={
            "full_name": "Duplicate Customer",
            "email": "duplicate@example.com",
            "phone": None,
        },
    )
    duplicate_customer = client.post(
        "/customers",
        json={
            "full_name": "Duplicate Customer Two",
            "email": "duplicate@example.com",
            "phone": None,
        },
    )

    assert first_product.status_code == 201
    assert duplicate_product.status_code == 400
    assert duplicate_product.json()["detail"] == "Product SKU already exists."
    assert first_customer.status_code == 201
    assert duplicate_customer.status_code == 400
    assert duplicate_customer.json()["detail"] == "Customer email already exists."


def test_validation_and_missing_resource_status_codes():
    invalid_product = client.post(
        "/products",
        json={
            "name": "Invalid Product",
            "sku": "INV-001",
            "price": "5.00",
            "quantity_in_stock": -1,
        },
    )
    missing_product = client.get("/products/9999")

    assert invalid_product.status_code == 422
    assert missing_product.status_code == 404
    assert missing_product.json()["detail"] == "Product not found."
