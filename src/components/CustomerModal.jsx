import { useState } from "react";
import toast from "react-hot-toast";
import { ModalShell } from "./ModalShell";
import { addCustomer, updateCustomer } from "../utils/customerService";

export function CustomerModal({ onClose, customerToEdit, onSuccess }) {
  const [fullName, setFullName] = useState(customerToEdit?.fullName || "");
  const [phone, setPhone] = useState(customerToEdit?.phone || "");
  const [email, setEmail] = useState(customerToEdit?.email || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        });
        toast.success("Customer updated");
      } else {
        await addCustomer({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        });
        toast.success("Customer added");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={customerToEdit ? "Edit Customer" : "Add Customer"}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Optional"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
