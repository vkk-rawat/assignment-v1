import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import api, { getErrorMessage } from "../api/api";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { formatDate } from "../utils/format";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/customers");
      setCustomers(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validateCustomer() {
    if (!form.full_name.trim() || !form.email.trim()) {
      return "Full name and email are required.";
    }
    if (!emailPattern.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateCustomer();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/customers", {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
      });
      setForm(emptyForm);
      setMessage("Customer created.");
      await loadCustomers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.full_name}?`)) {
      return;
    }
    setMessage("");
    setError("");
    try {
      await api.delete(`/customers/${customer.id}`);
      setMessage("Customer deleted.");
      await loadCustomers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Customers</h1>
        </div>
      </div>

      <div className="content-grid wide-first">
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Add customer</h2>
              <p>Email values must be unique.</p>
            </div>
          </div>

          <Alert type="success" message={message} onClose={() => setMessage("")} />
          <Alert type="error" message={error} onClose={() => setError("")} />

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Full name</span>
              <input
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                placeholder="Avery Johnson"
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="avery@example.com"
                required
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="+1 555 0100"
              />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit" disabled={submitting}>
                <Plus size={16} />
                {submitting ? "Saving" : "Add"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <h2>Customer list</h2>
              <p>{customers.length} customers</p>
            </div>
            <button type="button" className="button secondary" onClick={loadCustomers}>
              Refresh
            </button>
          </div>

          {loading ? <Loading label="Loading customers" /> : null}

          {!loading && customers.length === 0 ? (
            <EmptyState title="No customers yet" />
          ) : null}

          {!loading && customers.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td data-label="Name">{customer.full_name}</td>
                      <td data-label="Email">{customer.email}</td>
                      <td data-label="Phone">{customer.phone || "Not provided"}</td>
                      <td data-label="Created">{formatDate(customer.created_at)}</td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => deleteCustomer(customer)}
                            aria-label={`Delete ${customer.full_name}`}
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
