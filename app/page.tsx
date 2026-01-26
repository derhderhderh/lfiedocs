import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Users,
  FileText,
  Lock,
  Bell,
  CheckCircle,
  ArrowRight,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">LifeDocs Family</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#security" className="text-sm text-muted-foreground hover:text-foreground">
              Security
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-card py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Protect Your Family{"'"}s Future with Secure Document Storage
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
              LifeDocs Family helps you securely store essential documents and prepare for
              life{"'"}s unexpected moments. Grant trusted contacts emergency access when it
              matters most.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Start Your Family Vault
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 opacity-5">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything Your Family Needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive document management with built-in emergency planning
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get set up in minutes and protect what matters most
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One subscription for your entire family
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
            {/* Basic Plan */}
            <div className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-lg font-semibold text-foreground">Basic Plan</h3>
              <p className="mt-2 text-sm text-muted-foreground">Perfect for small families</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-foreground">$7.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 space-y-4">
                {basicFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-8 block">
                <Button variant="outline" className="w-full bg-transparent">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Extended Plan */}
            <div className="relative rounded-xl border-2 border-primary bg-card p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-foreground">Extended Plan</h3>
              <p className="mt-2 text-sm text-muted-foreground">For larger families</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-foreground">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 space-y-4">
                {extendedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-8 block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="bg-sidebar py-20 text-sidebar-foreground sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Bank-Level Security for Your Family{"'"}s Data
              </h2>
              <p className="mt-4 text-lg text-sidebar-foreground/80 leading-relaxed">
                Your documents are protected with enterprise-grade encryption and strict
                access controls. Only authorized family members and trusted contacts can
                access your vault.
              </p>
              <ul className="mt-8 space-y-4">
                {securityFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-sidebar-primary" />
                    <span className="text-sidebar-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {securityCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl bg-sidebar-accent p-6"
                >
                  <card.icon className="h-8 w-8 text-sidebar-primary" />
                  <h3 className="mt-4 font-semibold text-sidebar-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm text-sidebar-foreground/70">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl text-balance">
              Start Protecting Your Family Today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              Join thousands of families who trust LifeDocs to keep their important
              documents safe and accessible when needed.
            </p>
            <Link href="/auth/signup" className="mt-8 inline-block">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
              >
                Create Your Family Vault
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">LifeDocs Family</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} LifeDocs Family. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    title: "Secure Document Storage",
    description:
      "Upload and organize important documents like IDs, insurance policies, medical records, and legal documents in one secure place.",
    icon: FileText,
  },
  {
    title: "Family Collaboration",
    description:
      "Add family members with different permission levels. Parents can view dependent documents while members manage their own.",
    icon: Users,
  },
  {
    title: "Trusted Contacts",
    description:
      "Designate trusted individuals outside your family who can access your vault in case of emergency.",
    icon: Shield,
  },
  {
    title: "Emergency Access",
    description:
      "When life happens, authorized users can trigger emergency access for trusted contacts to help your family.",
    icon: Lock,
  },
  {
    title: "Expiration Reminders",
    description:
      "Never miss a renewal. Get email notifications before important documents like insurance or IDs expire.",
    icon: Bell,
  },
  {
    title: "Audit Logging",
    description:
      "Complete transparency with detailed logs of who accessed what and when, especially during emergencies.",
    icon: CheckCircle,
  },
]

const steps = [
  {
    title: "Create Your Family",
    description: "Sign up and create your family vault in minutes",
  },
  {
    title: "Add Trusted Contacts",
    description: "Designate people you trust for emergency access",
  },
  {
    title: "Upload Documents",
    description: "Organize your important family documents securely",
  },
  {
    title: "Peace of Mind",
    description: "Know your family is prepared for any situation",
  },
]

const basicFeatures = [
  "Up to 4 family members",
  "Unlimited document storage",
  "Trusted contact management",
  "Emergency access system",
  "Expiration reminders",
  "Audit logging",
  "Email support",
]

const extendedFeatures = [
  "Unlimited family members",
  "Everything in Basic",
  "Priority support",
  "Advanced audit reports",
  "Custom categories",
  "API access",
  "Dedicated account manager",
]

const securityFeatures = [
  "End-to-end encryption",
  "Two-factor authentication",
  "Role-based access control",
  "Complete audit trails",
  "GDPR compliant",
]

const securityCards = [
  {
    title: "Encrypted at Rest",
    description: "All documents are encrypted using AES-256 encryption",
    icon: Lock,
  },
  {
    title: "Access Control",
    description: "Fine-grained permissions for every family member",
    icon: Users,
  },
  {
    title: "Audit Trails",
    description: "Every action is logged and traceable",
    icon: FileText,
  },
  {
    title: "Data Isolation",
    description: "Your family data is completely isolated from others",
    icon: Shield,
  },
]
