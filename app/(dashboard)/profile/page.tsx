"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Loader2 } from "lucide-react";

const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN"];
const TIMEZONES = [
  "UTC",
  "Africa/Accra",
  "Africa/Lagos",
  "America/New_York",
  "Europe/London",
];
const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [timezone, setTimezone] = useState("Africa/Accra");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const { data } = await res.json();
          setFullName(data.fullName ?? "");
          setEmail(data.email ?? "");
          setCurrency(data.preferences?.currency ?? "GHS");
          setTimezone(data.preferences?.timezone ?? "Africa/Accra");
          if (data.preferences?.theme) {
            setTheme(data.preferences.theme);
          }
        } else if (user) {
          setFullName(user.fullName ?? "");
          setEmail(user.email ?? "");
          setCurrency(user.preferences?.currency ?? "GHS");
          setTimezone(user.preferences?.timezone ?? "Africa/Accra");
          if (user.preferences?.theme) {
            setTheme(user.preferences.theme);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, setTheme]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const themePreference = theme ?? "light";
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          preferences: { currency, timezone, theme: themePreference },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save");
      }
      setTheme(themePreference);
      await refreshUser();
      setMessage({ type: "success", text: "Profile saved successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || email || "U").charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and display preferences
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {initial}
            </div>
            <div>
              <CardTitle>{fullName || "Your profile"}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email is managed through Supabase Auth and cannot be changed
                here.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={theme ?? "light"}
                  onValueChange={(value) => setTheme(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
