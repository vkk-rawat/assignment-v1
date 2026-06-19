from decimal import Decimal

from app.database import Base, SessionLocal, engine
from app.models import Customer, Product


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            db.add_all(
                [
                    Product(
                        name="Wireless Barcode Scanner",
                        sku="SCN-100",
                        price=Decimal("89.99"),
                        quantity_in_stock=18,
                    ),
                    Product(
                        name="Thermal Label Printer",
                        sku="PRN-220",
                        price=Decimal("149.00"),
                        quantity_in_stock=6,
                    ),
                    Product(
                        name="Inventory Tablet Stand",
                        sku="STD-315",
                        price=Decimal("34.50"),
                        quantity_in_stock=4,
                    ),
                ]
            )

        if db.query(Customer).count() == 0:
            db.add_all(
                [
                    Customer(
                        full_name="Avery Johnson",
                        email="avery@example.com",
                        phone="+1 555 0100",
                    ),
                    Customer(
                        full_name="Morgan Lee",
                        email="morgan@example.com",
                        phone="+1 555 0101",
                    ),
                ]
            )

        db.commit()
        print("Seed data loaded.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
