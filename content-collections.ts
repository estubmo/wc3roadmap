// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
//
// content-collections configuration — minimal stub for plan 01-01.
// The nodes collection is defined in plan 01-06 once the full Zod schema
// and patch registry are in place. Keeping this empty allows the build
// pipeline to resolve the @content-collections/vite plugin without errors.
import { defineConfig } from "@content-collections/core";

export default defineConfig({ content: [] });
