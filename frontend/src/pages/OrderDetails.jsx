import { ArrowLeft, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api, { getErrorMessage } from "../api/api";
import Alert from "../components/Alert";
import Loading from "../components/Loading";
import { formatCurrency, formatDate } from "../utils/format";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function cancelOrder() {
    if (!window.confirm(`Cancel order #${id} and restore stock?`)) {
      return;
    }
    setError("");
    try {
      await api.delete(`/orders/${id}`);
      navigate("/orders", {
        replace: true,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Order #{id}</h1>
        </div>
        <Link className="button secondary" to="/orders">
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />
      {loading ? <Loading label="Loading order" /> : null}

      {!loading && order ? (
        <section className="panel">
          <div className="detail-grid">
            <div>
              <span className="detail-label">Customer</span>
              <strong>{order.customer.full_name}</strong>
              <small>{order.customer.email}</small>
            </div>
            <div>
              <span className="detail-label">Created</span>
              <strong>{formatDate(order.created_at)}</strong>
            </div>
            <div>
              <span className="detail-label">Total</span>
              <strong>{formatCurrency(order.total_amount)}</strong>
            </div>
            <div className="detail-actions">
              <button type="button" className="button danger" onClick={cancelOrder}>
                <Trash2 size={16} />
                Cancel
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Product">{item.product.name}</td>
                    <td data-label="SKU">{item.product.sku}</td>
                    <td data-label="Quantity">{item.quantity}</td>
                    <td data-label="Unit price">{formatCurrency(item.unit_price)}</td>
                    <td data-label="Line total">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
