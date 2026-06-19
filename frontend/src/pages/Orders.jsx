import { Eye, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api, { getErrorMessage } from "../api/api";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { formatCurrency, formatDate } from "../utils/format";

const emptyItem = { product_id: "", quantity: 1 };

export default function Orders() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ customer_id: "", items: [{ ...emptyItem }] });
  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [customersRes, productsRes, ordersRes] = await Promise.all([
        api.get("/customers"),
        api.get("/products"),
        api.get("/orders"),
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productsById = useMemo(() => {
    return products.reduce((lookup, product) => {
      lookup[String(product.id)] = product;
      return lookup;
    }, {});
  }, [products]);

  const estimatedTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const product = productsById[String(item.product_id)];
      if (!product || !item.quantity) {
        return sum;
      }
      return sum + Number(product.price) * Number(item.quantity);
    }, 0);
  }, [form.items, productsById]);

  function updateCustomer(event) {
    setForm((current) => ({ ...current, customer_id: event.target.value }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  }

  function removeItem(index) {
    setForm((current) => {
      const remaining = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: remaining.length ? remaining : [{ ...emptyItem }],
      };
    });
  }

  function validateOrder() {
    if (!form.customer_id) {
      return "Select a customer.";
    }
    if (!form.items.length) {
      return "Add at least one product.";
    }
    for (const item of form.items) {
      if (!item.product_id) {
        return "Each order line must include a product.";
      }
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return "Each order line quantity must be a positive whole number.";
      }
    }
    return "";
  }

  function productIsSelectedElsewhere(productId, index) {
    return form.items.some(
      (item, itemIndex) =>
        itemIndex !== index && String(item.product_id) === String(productId)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLastCreatedOrder(null);

    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      customer_id: Number(form.customer_id),
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
    };

    setSubmitting(true);
    try {
      const response = await api.post("/orders", payload);
      setLastCreatedOrder(response.data);
      setMessage(
        `Order #${response.data.id} created. Total: ${formatCurrency(
          response.data.total_amount
        )}.`
      );
      setForm({ customer_id: "", items: [{ ...emptyItem }] });
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel order #${order.id} and restore stock?`)) {
      return;
    }
    setMessage("");
    setError("");
    try {
      await api.delete(`/orders/${order.id}`);
      setMessage("Order canceled and stock restored.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Orders</h1>
        </div>
      </div>

      <div className="content-grid wide-first">
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Create order</h2>
              <p>Inventory is reduced after the API accepts the order.</p>
            </div>
          </div>

          <Alert type="success" message={message} onClose={() => setMessage("")} />
          <Alert type="error" message={error} onClose={() => setError("")} />

          {lastCreatedOrder ? (
            <div className="result-strip">
              Backend total for order #{lastCreatedOrder.id}:{" "}
              <strong>{formatCurrency(lastCreatedOrder.total_amount)}</strong>
            </div>
          ) : null}

          <form className="stacked-form" onSubmit={handleSubmit}>
            <label>
              <span>Customer</span>
              <select
                value={form.customer_id}
                onChange={updateCustomer}
                disabled={loading}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="order-lines">
              {form.items.map((item, index) => {
                const selectedProduct = productsById[String(item.product_id)];
                return (
                  <div className="order-line" key={`${index}-${item.product_id}`}>
                    <label>
                      <span>Product</span>
                      <select
                        value={item.product_id}
                        onChange={(event) =>
                          updateItem(index, "product_id", event.target.value)
                        }
                        disabled={loading}
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                            disabled={productIsSelectedElsewhere(product.id, index)}
                          >
                            {product.name} ({product.quantity_in_stock} in stock)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                        required
                      />
                    </label>
                    <div className="line-total">
                      <span>Line total</span>
                      <strong>
                        {formatCurrency(
                          selectedProduct
                            ? Number(selectedProduct.price) * Number(item.quantity || 0)
                            : 0
                        )}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => removeItem(index)}
                      aria-label="Remove order line"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="order-footer">
              <button type="button" className="button secondary" onClick={addItem}>
                <Plus size={16} />
                Product
              </button>
              <div className="estimated-total">
                Estimated total
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button className="button primary" type="submit" disabled={submitting}>
                <Plus size={16} />
                {submitting ? "Creating" : "Create"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Order list</h2>
              <p>{orders.length} orders</p>
            </div>
            <button type="button" className="button secondary" onClick={loadData}>
              Refresh
            </button>
          </div>

          {loading ? <Loading label="Loading orders" /> : null}

          {!loading && orders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : null}

          {!loading && orders.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Items</th>
                    <th>Created</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Order">#{order.id}</td>
                      <td data-label="Customer">{order.customer.full_name}</td>
                      <td data-label="Total">{formatCurrency(order.total_amount)}</td>
                      <td data-label="Items">{order.items.length}</td>
                      <td data-label="Created">{formatDate(order.created_at)}</td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <Link
                            className="icon-button link-button"
                            to={`/orders/${order.id}`}
                            aria-label={`View order ${order.id}`}
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => cancelOrder(order)}
                            aria-label={`Cancel order ${order.id}`}
                            title="Cancel"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
