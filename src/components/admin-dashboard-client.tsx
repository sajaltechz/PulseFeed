"use client";

import { useMemo, useState } from "react";
import type { ContentType } from "@prisma/client";

type AdminItem = {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  viewCount: number;
  likeCount: number;
  description: string | null;
  body: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
};

type FormState = {
  title: string;
  description: string;
  body: string;
  mediaUrl: string;
  thumbnailUrl: string;
  type: ContentType;
  updateSlug: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  body: "",
  mediaUrl: "",
  thumbnailUrl: "",
  type: "ARTICLE",
  updateSlug: false,
};

export function AdminDashboardClient({ initialItems }: { initialItems: AdminItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editingItem = useMemo(() => items.find((item) => item.id === editId) ?? null, [items, editId]);

  function toPayload(form: FormState) {
    return {
      title: form.title,
      description: form.description || undefined,
      body: form.body || undefined,
      mediaUrl: form.mediaUrl || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      type: form.type,
      updateSlug: form.updateSlug,
    };
  }

  async function createContent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(createForm)),
      });
      const data = (await res.json()) as { item?: AdminItem; error?: string };
      if (!res.ok || !data.item) {
        setMessage(data.error ?? "Failed to create content.");
        return;
      }
      setItems((prev) => [data.item as AdminItem, ...prev]);
      setCreateForm(emptyForm);
      setMessage("Content created.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      const data = (await res.json()) as { item?: AdminItem; error?: string };
      if (!res.ok || !data.item) {
        setMessage(data.error ?? "Failed to update content.");
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === editId ? (data.item as AdminItem) : item)));
      setEditId(null);
      setMessage("Content updated.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteContent(id: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessage("Failed to delete content.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editId === id) setEditId(null);
      setMessage("Content deleted.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: AdminItem) {
    setEditId(item.id);
    setEditForm({
      title: item.title,
      description: item.description ?? "",
      body: item.body ?? "",
      mediaUrl: item.mediaUrl ?? "",
      thumbnailUrl: item.thumbnailUrl ?? "",
      type: item.type,
      updateSlug: false,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <form onSubmit={createContent} className="space-y-3 rounded-lg border border-zinc-700/30 p-4">
        <h2 className="font-semibold">Create Content</h2>
        <input
          required
          value={createForm.title}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
          placeholder="Title"
        />
        <textarea
          value={createForm.description}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
          placeholder="Description"
          rows={2}
        />
        <select
          value={createForm.type}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value as ContentType }))}
          className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
        >
          <option value="ARTICLE">ARTICLE</option>
          <option value="VIDEO">VIDEO</option>
        </select>
        <input
          value={createForm.mediaUrl}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
          className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
          placeholder="Media URL"
        />
        <input
          value={createForm.thumbnailUrl}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
          className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
          placeholder="Thumbnail URL"
        />
        <button disabled={loading} className="w-full rounded-md border px-3 py-2 disabled:opacity-50">
          Create
        </button>
      </form>

      <div className="space-y-3">
        {message ? <p className="rounded-md border border-zinc-700/30 px-3 py-2 text-sm">{message}</p> : null}
        {editingItem ? (
          <form onSubmit={saveEdit} className="space-y-3 rounded-lg border border-zinc-700/30 p-4">
            <h2 className="font-semibold">Edit: {editingItem.title}</h2>
            <input
              required
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-md border border-zinc-700/30 bg-transparent px-3 py-2"
              rows={2}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.updateSlug}
                onChange={(e) => setEditForm((prev) => ({ ...prev, updateSlug: e.target.checked }))}
              />
              Update slug with title change
            </label>
            <div className="flex gap-2">
              <button disabled={loading} className="rounded-md border px-3 py-2 disabled:opacity-50">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-md border px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-zinc-700/30 p-4">
            <p className="text-xs text-zinc-500">{item.type}</p>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-xs text-zinc-500">
              slug: {item.slug} | views: {item.viewCount} | likes: {item.likeCount}
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => startEdit(item)} className="rounded-md border px-3 py-1.5 text-sm">
                Edit
              </button>
              <button
                onClick={() => void deleteContent(item.id)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
