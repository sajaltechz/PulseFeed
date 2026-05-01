"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid credentials");
      return;
    }
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border p-6">
        <h1 className="text-xl font-semibold">Sign In</h1>
        <p className="text-sm text-zinc-500">
          Demo: <span className="font-medium">user@pulsefeed.local</span> /{" "}
          <span className="font-medium">user1234</span>
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border px-3 py-2"
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button type="submit" className="w-full rounded-md border px-3 py-2 font-medium">
          Continue
        </button>
      </form>
    </main>
  );
}
