import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import api, { getErrorMessage } from "../api/api";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { formatCurrency, formatDate } from "../utils/format";

const emptyForm = {
  name: "",
  sku: "",
  price: "",
  quantity_in_stock: "",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function validateProduct() {
    if (!form.name.trim() || !form.sku.trim()) {
      return "Product name and SKU are required.";
    }
    if (Number(form.price) < 0 || form.price === "") {
      return "Price must be zero or greater.";
    }
    if (
      Number(form.quantity_in_stock) < 0 ||
      form.quantity_in_stock === "" ||
      !Number.isInteger(Number(form.quantity_in_stock))
    ) {
      return "Quantity must be a whole number of zero or greater.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateProduct();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity_in_stock: Number(form.quantity_in_stock),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setMessage("Product updated.");
      } else {
        await api.post("/products", payload);
        setMessage("Product created.");
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity_in_stock: String(product.quantity_in_stock),
    });
    setMessage("");
    setError("");
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }
    setMessage("");
    setError("");
    try {
      await api.delete(`/products/${product.id}`);
      setMessage("Product deleted.");
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Products</h1>
        </div>
      </div>

      <div className="content-grid wide-first">
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>{editingId ? "Edit product" : "Add product"}</h2>
              <p>SKU values must be unique.</p>
            </div>
          </div>

          <Alert type="success" message={message} onClose={() => setMessage("")} />
          <Alert type="error" message={error} onClose={() => setError("")} />

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Wireless scanner"
                required
              />
            </label>
            <label>
              <span>SKU</span>
              <input
                name="sku"
                value={form.sku}
                onChange={updateField}
                placeholder="SCN-100"
                required
              />
            </label>
            <label>
              <span>Price</span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={updateField}
                placeholder="89.99"
                required
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                name="quantity_in_stock"
                type="number"
                min="0"
                step="1"
                value={form.quantity_in_stock}
                onChange={updateField}
                placeholder="18"
                required
              />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit" disabled={submitting}>
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {submitting ? "Saving" : editingId ? "Save" : "Add"}
              </button>
              {editingId ? (
                <button className="button secondary" type="button" onClick={resetForm}>
                  <X size={16} />
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Product list</h2>
              <p>{products.length} products</p>
            </div>
            <button type="button" className="button secondary" onClick={loadProducts}>
              Refresh
            </button>
          </div>

          {loading ? <Loading label="Loading products" /> : null}

          {!loading && products.length === 0 ? (
            <EmptyState title="No products yet" />
          ) : null}

          {!loading && products.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Updated</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td data-label="Name">{product.name}</td>
                      <td data-label="SKU">{product.sku}</td>
                      <td data-label="Price">{formatCurrency(product.price)}</td>
                      <td data-label="Quantity">
                        <span
                          className={
                            product.quantity_in_stock <= 5
                              ? "badge warning"
                              : "badge neutral"
                          }
                        >
                          {product.quantity_in_stock}
                        </span>
                      </td>
                      <td data-label="Updated">{formatDate(product.updated_at)}</td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => startEditing(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => deleteProduct(product)}
                            aria-label={`Delete ${product.name}`}
                            title="Delete"
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
