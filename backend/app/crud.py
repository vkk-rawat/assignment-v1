from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas


def _commit_or_duplicate_error(db: Session, duplicate_message: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=duplicate_message,
        ) from exc


def get_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )
    return product


def list_products(db: Session) -> list[models.Product]:
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


def create_product(db: Session, product_in: schemas.ProductCreate) -> models.Product:
    product = models.Product(**product_in.model_dump())
    db.add(product)
    _commit_or_duplicate_error(db, "Product SKU already exists.")
    db.refresh(product)
    return product


def update_product(
    db: Session, product_id: int, product_in: schemas.ProductUpdate
) -> models.Product:
    product = get_product(db, product_id)
    updates = product_in.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(product, key, value)
    _commit_or_duplicate_error(db, "Product SKU already exists.")
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    if product.order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a product that appears in orders. Cancel related orders first.",
        )
    db.delete(product)
    db.commit()


def get_customer(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )
    return customer


def list_customers(db: Session) -> list[models.Customer]:
    return db.query(models.Customer).order_by(models.Customer.created_at.desc()).all()


def create_customer(db: Session, customer_in: schemas.CustomerCreate) -> models.Customer:
    data = customer_in.model_dump()
    data["email"] = data["email"].lower()
    customer = models.Customer(**data)
    db.add(customer)
    _commit_or_duplicate_error(db, "Customer email already exists.")
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    if customer.orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a customer with orders. Cancel related orders first.",
        )
    db.delete(customer)
    db.commit()


def _get_order_query(db: Session):
    return db.query(models.Order).options(
        joinedload(models.Order.customer),
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
    )


def get_order(db: Session, order_id: int) -> models.Order:
    order = _get_order_query(db).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )
    return order


def list_orders(db: Session) -> list[models.Order]:
    return _get_order_query(db).order_by(models.Order.created_at.desc()).all()


def create_order(db: Session, order_in: schemas.OrderCreate) -> models.Order:
    customer = db.get(models.Customer, order_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    requested_quantities: dict[int, int] = defaultdict(int)
    for item in order_in.items:
        requested_quantities[item.product_id] += item.quantity

    product_ids = list(requested_quantities.keys())
    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(product_ids))
        .with_for_update()
        .all()
    )
    products_by_id = {product.id: product for product in products}

    missing_ids = sorted(set(product_ids) - set(products_by_id))
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found: {', '.join(map(str, missing_ids))}.",
        )

    for product_id, quantity in requested_quantities.items():
        product = products_by_id[product_id]
        if quantity > product.quantity_in_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for {product.name}. "
                    f"Requested {quantity}, available {product.quantity_in_stock}."
                ),
            )

    total_amount = sum(
        products_by_id[product_id].price * Decimal(quantity)
        for product_id, quantity in requested_quantities.items()
    )

    order = models.Order(customer_id=customer.id, total_amount=total_amount)
    db.add(order)
    db.flush()

    for product_id, quantity in requested_quantities.items():
        product = products_by_id[product_id]
        product.quantity_in_stock -= quantity
        db.add(
            models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                line_total=product.price * Decimal(quantity),
            )
        )

    db.commit()
    return get_order(db, order.id)


def delete_order(db: Session, order_id: int) -> None:
    order = get_order(db, order_id)
    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product:
            product.quantity_in_stock += item.quantity
    db.delete(order)
    db.commit()
