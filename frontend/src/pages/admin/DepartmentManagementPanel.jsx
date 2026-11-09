import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api";

const INPUT =
  "w-full rounded-xl border border-[#cfe9f0] bg-white px-3 py-2 text-sm text-[#4a4a4a] focus:outline-none focus:border-[#1B8FC0]";

export default function DepartmentManagementPanel({ user, toast }) {
  const [counties, setCounties] = useState([]);
  const [countyId, setCountyId] = useState(user.county_id || "");
  const [departments, setDepartments] = useState([]);
  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let active = true;
    api.reference.getCounties()
      .then((rows) => {
        if (active) setCounties(rows || []);
      })
      .catch((cause) => {
        if (active) setError(`Could not load counties: ${cause.message}`);
      })
      .finally(() => {
        if (active) setLoadingCounties(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!countyId) {
      setDepartments([]);
      return undefined;
    }
    let active = true;
    setLoadingDepartments(true);
    setError("");
    api.reference.getDepartments(countyId)
      .then((rows) => {
        if (active) setDepartments(rows || []);
      })
      .catch((cause) => {
        if (active) setError(`Could not load departments: ${cause.message}`);
      })
      .finally(() => {
        if (active) setLoadingDepartments(false);
      });
    return () => { active = false; };
  }, [countyId]);

  const clearForm = () => {
    setName("");
    setCode("");
    setEditingId(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!countyId) return;
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), code: code.trim() || null };
      if (editingId) {
        await api.reference.updateDepartment(editingId, payload);
        toast.success("Department updated.");
      } else {
        await api.reference.createDepartment(countyId, payload);
        toast.success("Department created.");
      }
      setDepartments(await api.reference.getDepartments(countyId));
      clearForm();
    } catch (cause) {
      setError(cause.message || "Could not save this department.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    if (!window.confirm(`Delete ${department.name}? Departments assigned to users or reports cannot be deleted.`)) {
      return;
    }
    setError("");
    try {
      await api.reference.deleteDepartment(department.id);
      setDepartments(await api.reference.getDepartments(countyId));
      if (editingId === department.id) clearForm();
      toast.success("Department deleted.");
    } catch (cause) {
      setError(cause.message || "Could not delete this department.");
    }
  };

  const handleEdit = (department) => {
    setName(department.name);
    setCode(department.code || "");
    setEditingId(department.id);
  };

  return (
    <section className="rounded-3xl border border-[#cfe9f0] bg-white/80 p-5 shadow-[0_10px_30px_-14px_rgba(11,90,156,0.25)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-extrabold text-[#0B5A9C]">County departments</h2>
        <p className="mt-1 text-sm text-[#5F5F5F]">
          Manage the departments configured for each county. Departments in use cannot be deleted.
        </p>
      </div>

      <div className="mb-5 max-w-xl">
        <label htmlFor="department-county" className="mb-1 block text-xs font-bold text-[#5F5F5F]">
          County
        </label>
        {user.county_id ? (
          <div className={`${INPUT} bg-[#E6F5F8]`}>
            {user.county?.name || counties.find((county) => county.id === user.county_id)?.name || "Your county"}
          </div>
        ) : (
          <select
            id="department-county"
            className={INPUT}
            value={countyId}
            onChange={(event) => {
              setCountyId(event.target.value);
              clearForm();
            }}
            disabled={loadingCounties}
          >
            <option value="">{loadingCounties ? "Loading counties..." : "Select a county"}</option>
            {counties.map((county) => (
              <option key={county.id} value={county.id}>{county.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!countyId ? (
        <p className="rounded-2xl bg-[#E6F5F8] p-5 text-sm text-[#5F5F5F]">
          Select a county to view and manage its departments.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <div className="space-y-3">
            {loadingDepartments ? (
              <p role="status" className="rounded-2xl bg-[#E6F5F8] p-5 text-sm text-[#5F5F5F]">
                Loading departments...
              </p>
            ) : departments.length === 0 ? (
              <p className="rounded-2xl bg-[#E6F5F8] p-5 text-sm text-[#5F5F5F]">
                No departments are configured for this county yet.
              </p>
            ) : departments.map((department) => (
              <article key={department.id} className="flex flex-col gap-3 rounded-2xl border border-[#cfe9f0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-[#4a4a4a]">{department.name}</h3>
                  <p className="mt-1 text-xs text-[#7a8a90]">{department.code || "No code"}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEdit(department)} className="inline-flex items-center gap-1 rounded-full bg-[#E6F5F8] px-3 py-2 text-xs font-semibold text-[#0B5A9C]">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(department)} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          <form onSubmit={handleSave} className="h-fit space-y-3 rounded-2xl border border-[#cfe9f0] bg-[#E6F5F8] p-4">
            <h3 className="font-bold text-[#0B5A9C]">{editingId ? "Edit department" : "Add department"}</h3>
            <div>
              <label htmlFor="department-name" className="mb-1 block text-xs font-semibold text-[#5F5F5F]">Name</label>
              <input id="department-name" className={INPUT} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
            </div>
            <div>
              <label htmlFor="department-code" className="mb-1 block text-xs font-semibold text-[#5F5F5F]">Code <span className="font-normal">(optional)</span></label>
              <input id="department-code" className={INPUT} value={code} onChange={(event) => setCode(event.target.value)} maxLength={60} pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*" title="Use letters, numbers, and single hyphens." />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={saving || loadingDepartments} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                <Plus className="h-4 w-4" /> {saving ? "Saving..." : editingId ? "Save changes" : "Create department"}
              </button>
              {editingId && (
                <button type="button" onClick={clearForm} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#5F5F5F]">
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
