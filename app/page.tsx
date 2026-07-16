// Path: app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  TrendingUp,
  Calendar,
  AlertCircle,
  Zap,
  BarChart3,
  Lightbulb,
  Brain,
} from "lucide-react";
import { TypewriterText } from "@/components/landing/TypewriterText";

const HERO_IMAGE = "/Africa-SMES.jpg";
const HERO_HEADLINE = "Take control of your business finances";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero with SME imagery */}
      <div className="relative min-h-[92vh] flex flex-col">
        <Image
          src={HERO_IMAGE}
          alt="African SME team collaborating with analytics and technology"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-linear-to-b from-slate-950/85 via-slate-950/70 to-slate-950"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-primary/10 mix-blend-multiply"
          aria-hidden
        />

        <nav className="relative z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">ChronoBank</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <section className="relative z-10 flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary-foreground/90 mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 backdrop-blur-sm">
              Built for SMEs
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance leading-tight min-h-[2.8em] sm:min-h-[2.4em]">
              <TypewriterText text={HERO_HEADLINE} speed={45} startDelay={500} />
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
              ChronoBank helps small and medium enterprises understand spending,
              forecast cash flow, and act on intelligent insights — from one
              timeline.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white px-8 h-12 text-base"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-white">Timeline View</CardTitle>
              <CardDescription className="text-slate-400">
                Visualize all transactions in an interactive calendar grid
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <CardTitle className="text-white">Spending Predictions</CardTitle>
              <CardDescription className="text-slate-400">
                Forecasts based on your real spending patterns
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <CardTitle className="text-white">Smart Alerts</CardTitle>
              <CardDescription className="text-slate-400">
                Get notified of budget overages, anomalies, and milestones
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-violet-600/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-violet-400" />
              </div>
              <CardTitle className="text-white">Advanced Analytics</CardTitle>
              <CardDescription className="text-slate-400">
                Dive deep into spending trends and income patterns
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-rose-600/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-rose-400" />
              </div>
              <CardTitle className="text-white">Budget Management</CardTitle>
              <CardDescription className="text-slate-400">
                Set category budgets and track progress in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white">AI Insights</CardTitle>
              <CardDescription className="text-slate-400">
                Personalized recommendations and anomaly detection
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "1", title: "Sign Up", desc: "Create your account in seconds" },
            {
              step: "2",
              title: "Import Data",
              desc: "Add accounts or upload your transactions",
            },
            {
              step: "3",
              title: "Set Goals",
              desc: "Define budgets and financial targets",
            },
            {
              step: "4",
              title: "Analyze & Predict",
              desc: "Get insights and forecasts instantly",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-bold text-lg">
                  {step}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="rounded-xl border border-primary/30 bg-linear-to-r from-primary/90 to-primary p-10 sm:p-12 text-center shadow-xl shadow-primary/20">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to transform your finances?
          </h2>
          <p className="text-primary-foreground/85 mb-8 max-w-xl mx-auto">
            Join SMEs using ChronoBank to understand cash flow and plan with
            confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 px-8 font-semibold"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-primary-foreground/80 bg-transparent text-primary-foreground shadow-none hover:bg-primary-foreground/15 hover:text-primary-foreground dark:bg-transparent dark:border-primary-foreground/80 dark:hover:bg-primary-foreground/15 px-8"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} ChronoBank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
