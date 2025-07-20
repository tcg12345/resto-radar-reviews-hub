import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Heart, Users, TrendingUp, Award, ChefHat, Utensils, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import heroImage from '@/assets/hero-restaurant.jpg';

const features = [
  {
    icon: Star,
    title: 'Rate & Review',
    description: 'Keep track of your dining experiences with detailed ratings and personal notes.',
    color: 'text-yellow-500'
  },
  {
    icon: MapPin,
    title: 'Interactive Map',
    description: 'Visualize all your restaurants on a beautiful map with location details.',
    color: 'text-blue-500'
  },
  {
    icon: Heart,
    title: 'Wishlist',
    description: 'Save restaurants you want to try and never forget about that perfect spot.',
    color: 'text-red-500'
  },
  {
    icon: Award,
    title: 'Michelin Tracking',
    description: 'Track Michelin-starred restaurants and build your fine dining collection.',
    color: 'text-purple-500'
  },
  {
    icon: TrendingUp,
    title: 'Smart Filters',
    description: 'Find restaurants by cuisine, price range, rating, and more with advanced filtering.',
    color: 'text-green-500'
  },
  {
    icon: Users,
    title: 'Personal Collection',
    description: 'Build your personal restaurant portfolio and track your culinary journey.',
    color: 'text-indigo-500'
  }
];

const stats = [
  { label: 'Restaurants Tracked', value: '1,000+', icon: Utensils },
  { label: 'Active Users', value: '50+', icon: Users },
  { label: 'Cities Covered', value: '100+', icon: MapPin },
  { label: 'Reviews Written', value: '5,000+', icon: Star }
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleViewDemo = () => {
    navigate('/demo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <GrubbyLogo size="lg" />
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-10 w-10"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={handleGetStarted}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="text-sm">
                  ✨ Your Personal Restaurant Companion
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Track, Rate & 
                  <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"> Discover</span>
                  <br />
                  Amazing Restaurants
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Build your personal restaurant collection, track your dining experiences, and never forget a great meal again.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
                  Start Your Journey
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8" onClick={handleViewDemo}>
                  View Demo
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-8">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <stat.icon className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold text-primary">{stat.value}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl transform rotate-6" />
              <div className="relative bg-card border rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Fine dining experience" 
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Le Bernardin</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-sm">9.5/10</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-500 text-black">
                      ⭐ 3 Michelin Stars
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Everything You Need to Track Your Dining
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From casual dining to Michelin-starred experiences, organize and remember every meal with powerful tools designed for food lovers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-2 ${
                  activeFeature === index ? 'border-primary shadow-lg' : 'border-transparent'
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            Ready to Start Your Culinary Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of food lovers who are already tracking their favorite restaurants and discovering new culinary adventures.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8 py-6"
            onClick={handleGetStarted}
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <GrubbyLogo size="sm" />
            </div>
            <div className="text-muted-foreground text-sm">
              © 2024 Grubby. Track your culinary journey.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}