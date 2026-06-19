import { AlertTriangle, Boxes, ClipboardList, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import api, { getErrorMessage } from "../api/api";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { formatCurrency, formatDate } from "../utils/format";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsRes, customersRes, ordersRes] = await Promise.all([
        api.get("/products"),
        api.get("/customers"),
        api.get("/orders"),
      ]);
      setProducts(productsRes.data);
      setCustomers(customersRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.quantity_in_stock <= 5),
    [products]
  );

  const totalRevenue = useMemo(
    () =>
      orders.reduce((sum, order) => {
        return sum + Number(order.total_amount || 0);
      }, 0),
    [orders]
  );

  const summaryCards = [
    {
      label: "Total products",
      value: products.length,
      icon: Boxes,
      tone: "teal",
    },
    {
      label: "Total customers",
      value: customers.length,
      icon: UsersRound,
      tone: "blue",
    },
    {
      label: "Total orders",
      value: orders.length,
      icon: ClipboardList,
      tone: "green",
    },
    {
      label: "Low stock",
      value: lowStockProducts.length,
      icon: AlertTriangle,
      tone: "amber",
    },
  ];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Business overview</p>
          <h1>Dashboard</h1>
        </div>
        <button type="button" className="button secondary" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {loading ? <Loading label="Loading dashboard" /> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="summary-grid">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className={`stat-card tone-${card.tone}`} key={card.label}>
                  <div className="stat-icon">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              );
            })}
          </div>

          <div className="content-grid">
            <section className="panel">
              <div className="section-header">
                <div>
                  <h2>Low stock products</h2>
                  <p>Items with quantity of 5 or less.</p>
                </div>
              </div>

              {lowStockProducts.length === 0 ? (
                <EmptyState title="Stock levels look good" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map((product) => (
                        <tr key={product.id}>
                          <td data-label="Product">{product.name}</td>
                          <td data-label="SKU">{product.sku}</td>
                          <td data-label="Quantity">
                            <span className="badge warning">
                              {product.quantity_in_stock}
                            </span>
                          </td>
                          <td data-label="Price">{formatCurrency(product.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <div>
                  <h2>Recent orders</h2>
                  <p>Total value: {formatCurrency(totalRevenue)}</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <EmptyState title="No orders yet" />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td data-label="Order">#{order.id}</td>
                          <td data-label="Customer">{order.customer.full_name}</td>
                          <td data-label="Total">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td data-label="Created">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
