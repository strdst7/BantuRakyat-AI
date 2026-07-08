"use client";

import { useEffect, useState } from "react";

type AidProgram = {
  id: number;
  name: string;
  nameMs: string;
  description: string;
  descriptionMs: string;
  category: string;
  state: string | null;
  status: string;
  monthlySavings: number;
  deadline: string | null;
};

export default function AdminPage() {
  const [programs, setPrograms] = useState<AidProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    setLoading(true);
    const res = await fetch("/api/all-programs");
    const data = await res.json();
    setPrograms(data);
    setLoading(false);
  }

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    await fetch(`/api/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchPrograms();
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">🛠️ BantuRakyat Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Manage aid programs & deadlines</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition">
              ← Back to App
            </a>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition font-semibold"
            >
              + New Program
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold">{programs.length}</p>
            <p className="text-xs text-slate-400">Total Programs</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">
              {programs.filter((p) => p.status === "active").length}
            </p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-red-400">
              {programs.filter((p) => p.status === "closed").length}
            </p>
            <p className="text-xs text-slate-400">Closed</p>
          </div>
        </div>

        {/* New program form */}
        {showNewForm && (
          <NewProgramForm
            onCreated={() => {
              setShowNewForm(false);
              fetchPrograms();
            }}
          />
        )}

        {/* Programs table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Savings</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : (
                programs.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-750">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.nameMs}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {p.state || "National"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-green-400">
                      {p.monthlySavings > 0 ? `RM${p.monthlySavings}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          p.status === "active"
                            ? "bg-green-900 text-green-400"
                            : "bg-red-900 text-red-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(p.id, p.status!)}
                        className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                      >
                        {p.status === "active" ? "Close" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function NewProgramForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    nameMs: "",
    description: "",
    descriptionMs: "",
    category: "cash",
    state: "",
    incomeMin: "",
    incomeMax: "",
    monthlySavings: "0",
    deadline: "",
    applicationLink: "",
    documents: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      incomeMin: form.incomeMin ? parseInt(form.incomeMin) : null,
      incomeMax: form.incomeMax ? parseInt(form.incomeMax) : null,
      monthlySavings: parseInt(form.monthlySavings) || 0,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      documents: form.documents.split("\n").filter(Boolean),
      documentsMs: form.documents.split("\n").filter(Boolean),
      state: form.state || null,
    };

    await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-5 mb-6 space-y-3">
      <h3 className="font-semibold text-sm">New Aid Program</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Name (EN)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-green-500"
          required
        />
        <input
          placeholder="Name (BM)"
          value={form.nameMs}
          onChange={(e) => setForm({ ...form, nameMs: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-green-500"
          required
        />
        <textarea
          placeholder="Description (EN)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-green-500 col-span-2"
          rows={2}
          required
        />
        <textarea
          placeholder="Description (BM)"
          value={form.descriptionMs}
          onChange={(e) => setForm({ ...form, descriptionMs: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-green-500 col-span-2"
          rows={2}
          required
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        >
          <option value="cash">Cash</option>
          <option value="subsidy">Subsidy</option>
          <option value="education">Education</option>
          <option value="health">Health</option>
          <option value="welfare">Welfare</option>
          <option value="state">State</option>
        </select>
        <input
          placeholder="State (blank = national)"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        />
        <input
          type="number"
          placeholder="Income Min (RM)"
          value={form.incomeMin}
          onChange={(e) => setForm({ ...form, incomeMin: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        />
        <input
          type="number"
          placeholder="Income Max (RM)"
          value={form.incomeMax}
          onChange={(e) => setForm({ ...form, incomeMax: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        />
        <input
          type="number"
          placeholder="Monthly Savings (RM)"
          value={form.monthlySavings}
          onChange={(e) => setForm({ ...form, monthlySavings: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        />
        <input
          type="date"
          placeholder="Deadline"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600"
        />
        <input
          placeholder="Application Link"
          value={form.applicationLink}
          onChange={(e) => setForm({ ...form, applicationLink: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 col-span-2"
        />
        <textarea
          placeholder="Documents (one per line)"
          value={form.documents}
          onChange={(e) => setForm({ ...form, documents: e.target.value })}
          className="bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-600 col-span-2"
          rows={3}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Create Program"}
      </button>
    </form>
  );
}
