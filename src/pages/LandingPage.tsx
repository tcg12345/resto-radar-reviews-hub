import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Heart, Users, TrendingUp, Award, ChefHat, Utensils, Moon, Sun, Bot, Mic, Search, Calendar, Camera, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import heroImage from '@/assets/hero-restaurant.jpg';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Discovery',
    description: 'Smart search with natural language queries and personalized recommendations based on your preferences.',
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    icon: Star,
    title: 'Rate & Review',
    description: 'Track your dining experiences with detailed ratings, photos, and personal notes.',
    color: 'text-yellow-500',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  {
    icon: MapPin,
    title: 'Interactive Maps',
    description: 'Visualize restaurants on beautiful maps with real-time location data and directions.',
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: Heart,
    title: 'Smart Wishlist',
    description: 'Save restaurants you want to try with AI-powered suggestions and instant wishlist management.',
    color: 'text-red-500',
    gradient: 'from-red-500 to-red-600'
  },
  {
    icon: Users,
    title: 'Friends & Social',
    description: 'Connect with friends, share your culinary discoveries, and see their recommendations.',
    color: 'text-indigo-500',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  {
    icon: Award,
    title: 'Michelin Tracking',
    description: 'Track Michelin-starred restaurants with AI-powered star detection and fine dining collection.',
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    icon: Mic,
    title: 'Voice Assistant',
    description: 'Use voice commands to search, add restaurants, and get recommendations hands-free.',
    color: 'text-green-500',
    gradient: 'from-green-500 to-green-600'
  },
  {
    icon: Calendar,
    title: 'Reservations',
    description: 'Book tables directly through the app with integrated reservation management.',
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-600'
  },
  {
    icon: Camera,
    title: 'Photo Gallery',
    description: 'Capture and organize photos of your meals with automatic gallery creation.',
    color: 'text-pink-500',
    gradient: 'from-pink-500 to-pink-600'
  }
];

const stats = [
  { label: 'AI-Powered Features', value: '10+', icon: Bot },
  { label: 'Restaurant Discovery', value: 'Smart', icon: Search },
  { label: 'Global Coverage', value: 'Worldwide', icon: Globe },
  { label: 'User Experience', value: '5-Star', icon: Star }
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGetStarted = () => {
    console.log('Get Started clicked, navigating to /auth');
    navigate('/auth');
  };

  const handleViewDemo = () => {
    console.log('View Demo clicked, navigating to /demo');
    navigate('/demo');
  };

  const handleSignIn = () => {
    console.log('Sign In clicked, navigating to /auth');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted mobile-viewport no-horizontal-scroll">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b safe-area-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <GrubbyLogo size="lg" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-10 w-10 mobile-tap-target"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSignIn}
                className="hidden sm:inline-flex mobile-tap-target"
              >
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="mobile-button">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 pb-16 sm:pb-32 overflow-hidden mobile-container">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  ✨ AI-Powered Restaurant Discovery Platform
                </Badge>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Discover, Rate & 
                  <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"> Connect</span>
                  <br />
                  Your Culinary World
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                  The ultimate restaurant discovery platform powered by AI. Find perfect dining spots, connect with friends, and never forget a great meal again.
                </p>
              </div>
              
              <div className="flex flex-col gap-3 sm:gap-4">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted} 
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 mobile-button bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                >
                  Start Discovering Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 mobile-button" 
                  onClick={handleViewDemo}
                >
                  Try Live Demo
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start space-x-4 sm:space-x-8 pt-4 lg:pt-8">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1 sm:mr-2" />
                      <span className="text-lg sm:text-2xl font-bold text-primary">{stat.value}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl transform rotate-3 lg:rotate-6" />
              <div className="relative bg-card border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Fine dining experience" 
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-1">Le Bernardin</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-xs sm:text-sm">9.5/10</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-500 text-black text-xs sm:text-sm">
                      ⭐ 3 Stars
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-muted/30 mobile-container">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <Badge variant="outline" className="mb-4 text-xs sm:text-sm">
              Powerful Features
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Everything You Need for Restaurant Discovery
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              From AI-powered search to social sharing, experience the future of restaurant discovery with cutting-edge features designed for food enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer border group hover:-translate-y-1 mobile-card`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative z-10 p-4 sm:p-6">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 sm:mb-4 text-white shadow-lg`}>
                    <feature.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-sm sm:text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Highlight */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 mobile-container">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs sm:text-sm">
                🤖 AI-Powered Intelligence
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Smart Discovery Made Simple
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Our advanced AI understands your preferences and helps you discover restaurants you'll love. From natural language search to personalized recommendations, everything is powered by intelligent algorithms.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3 justify-center lg:justify-start">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm sm:text-base">Natural language restaurant search</span>
                </div>
                <div className="flex items-center space-x-3 justify-center lg:justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm sm:text-base">Personalized recommendations based on your tastes</span>
                </div>
                <div className="flex items-center space-x-3 justify-center lg:justify-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Mic className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm sm:text-base">Voice-activated restaurant assistant</span>
                </div>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="bg-card border rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-semibold">AI Assistant</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Ready to help</div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">You:</div>
                    <div className="text-sm sm:text-base">"Find me a cozy Italian restaurant for date night"</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-primary mb-2">AI Assistant:</div>
                    <div className="text-sm sm:text-base">I found 3 perfect Italian restaurants for your romantic evening! Here are my top picks based on ambiance and cuisine quality...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 lg:py-24 mobile-container">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-xs sm:text-sm lg:text-base text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-r from-primary via-primary to-primary-glow relative overflow-hidden mobile-container">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary-glow/90" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Dining Experience?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join the future of restaurant discovery with AI-powered search, personalized recommendations, and a vibrant community of food lovers.
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-white text-primary hover:bg-white/90 mobile-button"
              onClick={handleGetStarted}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 border-white text-white hover:bg-white/10 mobile-button"
              onClick={handleViewDemo}
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-background border-t mobile-container safe-area-bottom">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row items-center justify-between">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <GrubbyLogo size="sm" />
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm text-center">
              © 2024 Grubby. Discover your culinary world with AI.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}