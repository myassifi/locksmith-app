import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Shield, 
  Clock, 
  TrendingUp, 
  Package, 
  Users, 
  BarChart3,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Track all your customers and their service history in one place'
    },
    {
      icon: Clock,
      title: 'Job Scheduling',
      description: 'Manage appointments and track job status from start to finish'
    },
    {
      icon: Package,
      title: 'Inventory Tracking',
      description: 'Monitor stock levels and get low-stock alerts automatically'
    },
    {
      icon: BarChart3,
      title: 'Financial Analytics',
      description: 'Track revenue, profits, and material costs with detailed reports'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data is encrypted and backed up automatically'
    },
    {
      icon: TrendingUp,
      title: 'Grow Your Business',
      description: 'Make data-driven decisions to increase profitability'
    }
  ];

  const pricingFeatures = [
    'Unlimited customers & jobs',
    'Inventory management',
    'Financial analytics',
    'Mobile-friendly interface',
    'Real-time updates',
    'Email support'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-accent" />
              <span className="text-xl font-bold text-primary">Heat Wave Locksmith</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                className="bg-accent hover:bg-accent/90"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Manage Your Locksmith Business
            <span className="block text-primary mt-2">With Confidence</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete business management solution for locksmiths. Track customers, manage inventory, 
            schedule jobs, and grow your business with powerful analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-accent hover:bg-accent/90 text-lg px-8"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-lg px-8"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              All the tools you need to manage and grow your locksmith business in one place
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Icon className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a 7-day free trial. No credit card required.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <Card className="border-2 border-primary shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">Professional</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-primary">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription className="mt-4">
                  Perfect for growing locksmith businesses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {pricingFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full bg-accent hover:bg-accent/90"
                  onClick={() => navigate('/signup')}
                >
                  Start Free Trial
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  7-day free trial • No credit card required
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join locksmith professionals who trust Heat Wave to manage their business
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-accent hover:bg-accent/90 text-lg px-8"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2025 Heat Wave Locksmith. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
