// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <h1>WC3 Learning Roadmap</h1>
      <p>
        A free, open-source interactive node graph of Warcraft III learning
        concepts. Science-backed, community-driven.
      </p>
      <p>Coming soon.</p>
    </main>
  );
}
