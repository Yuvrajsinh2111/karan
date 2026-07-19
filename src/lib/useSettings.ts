"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Settings } from "./types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    supabase().from("settings").select("*").eq("id", 1).single()
      .then(({ data }) => setSettings(data as Settings));
  }, []);
  return settings;
}
