'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp, Calendar, AlertCircle, Zap, BarChart3, Lightbulb } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">ChronoBank</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6 text-balance">
          Take Control of Your Financial Future
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto text-balance">
          ChronoBank helps you understand, predict, and optimize your spending with powerful analytics, intelligent alerts, and timeline-based insights.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-8 py-6 text-lg">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Timeline View</CardTitle>
              <CardDescription className="text-slate-400">
                Visualize all transactions in an interactive calendar grid
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 2 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <CardTitle className="text-white">Spending Predictions</CardTitle>
              <CardDescription className="text-slate-400">
                6-month forecasts based on your spending patterns
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 3 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
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

          {/* Feature 4 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Advanced Analytics</CardTitle>
              <CardDescription className="text-slate-400">
                Dive deep into spending trends and income patterns
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 5 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-600/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-pink-400" />
              </div>
              <CardTitle className="text-white">Budget Management</CardTitle>
              <CardDescription className="text-slate-400">
                Set category budgets and track progress in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 6 */}
          <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white">AI Insights</CardTitle>
              <CardDescription className="text-slate-400">
                Get personalized recommendations and detect anomalies
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">1</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sign Up</h3>
            <p className="text-slate-400">Create your account in seconds</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">2</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Connect Accounts</h3>
            <p className="text-slate-400">Add your bank accounts or import transactions</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">3</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Set Goals</h3>
            <p className="text-slate-400">Define budgets and financial targets</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">4</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Analyze & Predict</h3>
            <p className="text-slate-400">Get insights and forecasts instantly</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Finances?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Join thousands of users who are taking control of their financial future with ChronoBank.
          </p>
          <Link href="/register">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg font-semibold">
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2024 ChronoBank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
