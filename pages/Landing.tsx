import React from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  GitBranch,
  Users,
  BarChart3,
  Cloud,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  LayoutDashboard,
  MessageSquare,
  Eye,
  TrendingUp,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Real-time Inventory Tracking',
    desc: 'Watch your stock levels update instantly across every branch. No delays, no guesswork—just accurate numbers at all times.',
  },
  {
    icon: GitBranch,
    title: 'Multi-Branch Management',
    desc: 'Manage multiple locations from a single dashboard. Transfer stock, compare performance, and keep everything in sync.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    desc: 'Keep your team connected with built-in messaging. Admins and workers can communicate without leaving the platform.',
  },
  {
    icon: BarChart3,
    title: 'Sales Analytics',
    desc: 'Understand your business with clear charts and reports. Track revenue, top products, and sales trends effortlessly.',
  },
  {
    icon: Cloud,
    title: 'Cloud Image Uploads',
    desc: 'Add product photos directly from your device. Images are stored securely in the cloud and available everywhere.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'Control what each team member can see and do. Admins have full access while workers focus on their daily tasks.',
  },
];

const steps = [
  {
    icon: Sparkles,
    title: 'Create Your Account',
    desc: 'Sign up in seconds. No credit card required to get started with your free plan.',
  },
  {
    icon: Package,
    title: 'Add Your Products',
    desc: 'Upload your inventory with names, prices, images, and quantities. Bulk import supported.',
  },
  {
    icon: TrendingUp,
    title: 'Start Selling',
    desc: 'Begin tracking sales, monitoring stock, and growing your business from day one.',
  },
];

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-slate-200/60 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              WareNova
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-all"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-violet-400/5 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-medium mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                Free for small businesses
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-6">
                Smart inventory management for{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  modern businesses
                </span>
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
                Track stock across branches, empower your team, and make data-driven decisions—all from one beautifully simple dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:shadow-xl hover:shadow-indigo-500/25 active:scale-[0.98] transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-slate-700 bg-white rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-200/60 overflow-hidden p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-slate-400 font-medium">dashboard</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white">
                      <p className="text-xs font-medium text-blue-100">Total Products</p>
                      <p className="text-2xl font-bold mt-1">2,847</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
                      <p className="text-xs font-medium text-emerald-100">In Stock</p>
                      <p className="text-2xl font-bold mt-1">2,614</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white">
                      <p className="text-xs font-medium text-violet-100">Low Stock</p>
                      <p className="text-2xl font-bold mt-1">233</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-xs font-medium text-slate-500 mb-3">Recent Activity</p>
                    {['iPhone 15 Pro — Sold ×2', 'USB-C Cable — Restocked ×50', 'AirPods Pro — Sold ×1'].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-sm text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-slate-400 mb-10">Trusted by businesses worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center justify-items-center">
            {[
              { value: '500+', label: 'Businesses' },
              { value: '10K+', label: 'Products Tracked' },
              { value: '99.9%', label: 'Uptime' },
              { value: '50K+', label: 'Sales Processed' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to manage inventory
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Powerful tools wrapped in a simple interface. No steep learning curve—just results.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100/50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-sm font-semibold text-indigo-600 mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Get started in three simple steps
            </h2>
            <p className="text-slate-500 leading-relaxed">
              No complicated setup. No training manuals. Just sign up and go.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-violet-200" />
            {steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Step {i + 1}</p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 mb-3">Roles & Permissions</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Designed for every member of your team
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Admins get full control. Workers get a focused, fast interface built for daily tasks.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Admin Card */}
            <div className="relative p-8 lg:p-10 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 rounded-3xl" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Admin</h3>
                <p className="text-sm text-slate-500 mb-8">Full access to manage your entire operation.</p>
                <ul className="space-y-3">
                  {[
                    { icon: Package, text: 'Create, edit, and delete products' },
                    { icon: Users, text: 'Add and manage team members' },
                    { icon: BarChart3, text: 'View sales analytics and reports' },
                    { icon: GitBranch, text: 'Manage branches and locations' },
                    { icon: ShieldCheck, text: 'Set roles and permissions' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <item.icon className="w-4 h-4 text-slate-400" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Worker Card */}
            <div className="relative p-8 lg:p-10 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 rounded-3xl" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                  <Eye className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Worker</h3>
                <p className="text-sm text-slate-500 mb-8">Focused tools for daily operations.</p>
                <ul className="space-y-3">
                  {[
                    { icon: Eye, text: 'View product catalog and stock levels' },
                    { icon: ShoppingBag, text: 'Process sales and transactions' },
                    { icon: MessageSquare, text: 'Message admin directly' },
                    { icon: Cloud, text: 'Upload product images' },
                    { icon: Zap, text: 'Quick search and filtering' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <item.icon className="w-4 h-4 text-slate-400" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-12 md:p-16 text-center shadow-2xl shadow-indigo-500/20">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to streamline your inventory?
              </h2>
              <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto">
                Join hundreds of businesses already using WareNova to manage their stock smarter. Start for free—no credit card needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-indigo-700 bg-white rounded-full hover:bg-indigo-50 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-full border border-white/30 hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  Login to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">WareNova</span>
              </div>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                Simple, powerful inventory management for businesses of all sizes. Built with care.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-indigo-600 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a></li>
                <li><a href="#roles" className="hover:text-indigo-600 transition-colors">Roles</a></li>
                <li><Link to="/login" className="hover:text-indigo-600 transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/about" className="hover:text-indigo-600 transition-colors">About</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy</Link></li>
                <li><Link to="/terms-of-ops" className="hover:text-indigo-600 transition-colors">Terms</Link></li>
                <li><Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">&copy; 2025 WareNova. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="https://x.com/vicky_oofficial" className="hover:text-slate-600 transition-colors">Twitter</a>
              <a href="https://github.com/vickyofficial77" className="hover:text-slate-600 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
