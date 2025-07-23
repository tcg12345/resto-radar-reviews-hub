import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Heart, Bot, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import heroImage from '@/assets/hero-restaurant.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted mobile-viewport">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b safe-area-top">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <GrubbyLogo size="lg" />
            </div>
            <div className="flex items-center mobile-grid-compact">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 lg:h-10 lg:w-10 mobile-tap-target"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 lg:h-5 lg:w-5" />
                ) : (
                  <Sun className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSignIn}
                className="mobile-button text-sm lg:text-base"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted} 
                className="mobile-button text-sm lg:text-base bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 lg:pt-24 pb-16 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Content */}
            <div className="mobile-space-compact lg:space-y-8">
              <Badge variant="secondary" className="mobile-badge lg:text-sm">
                ✨ AI-Powered Restaurant Discovery
              </Badge>
              
              <h1 className="text-3xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Discover Amazing
                <br />
                Restaurants
              </h1>
              
              <p className="text-sm lg:text-xl text-muted-foreground max-w-2xl mx-auto mobile-text">
                The smart way to find, rate, and share your favorite dining spots with AI-powered recommendations.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row justify-center mobile-grid-compact lg:gap-4 max-w-md mx-auto">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted} 
                  className="flex-1 mobile-button lg:text-lg lg:px-8 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                >
                  Start Discovering
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleSignIn}
                  className="flex-1 mobile-button lg:text-lg lg:px-8"
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative mt-8 lg:mt-16 max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-2xl transform rotate-2" />
              <Card className="relative overflow-hidden shadow-2xl border-0">
                <CardContent className="p-0">
                  <img 
                    src={heroImage} 
                    alt="Restaurant discovery" 
                    className="w-full h-48 lg:h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Sample Restaurant Card */}
                  <div className="absolute bottom-3 lg:bottom-6 left-3 lg:left-6 right-3 lg:right-6">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 lg:p-4 border border-white/20">
                      <div className="flex items-center justify-between text-white">
                        <div className="mobile-flex-shrink">
                          <h3 className="text-sm lg:text-lg font-semibold mb-1 mobile-truncate">Le Bernardin</h3>
                          <div className="flex items-center mobile-grid-compact">
                            <div className="flex items-center">
                              {[...Array(3)].map((_, i) => (
                                <Star key={i} className="h-2.5 w-2.5 lg:h-4 lg:w-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-xs lg:text-sm">9.5/10</span>
                          </div>
                        </div>
                        <div className="flex items-center mobile-grid-compact flex-shrink-0">
                          <Badge variant="secondary" className="bg-yellow-500 text-black mobile-badge">
                            ⭐ 3 Stars
                          </Badge>
                          <Heart className="h-3 w-3 lg:h-4 lg:w-4 fill-red-400 text-red-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Features */}
            <div className="mt-8 lg:mt-16 grid grid-cols-3 gap-3 lg:gap-8 max-w-lg mx-auto">
              <div className="text-center mobile-space-compact">
                <div className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-1 lg:mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3 w-3 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div className="text-xs lg:text-sm font-medium">AI Search</div>
              </div>
              <div className="text-center mobile-space-compact">
                <div className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-1 lg:mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-3 w-3 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div className="text-xs lg:text-sm font-medium">Rate & Review</div>
              </div>
              <div className="text-center mobile-space-compact">
                <div className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-1 lg:mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-3 w-3 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div className="text-xs lg:text-sm font-medium">Discover</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-8 lg:py-16 bg-gradient-to-r from-primary via-primary to-primary-glow">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl lg:text-3xl font-bold text-white mb-3 lg:mb-6">
            Ready to discover your next favorite restaurant?
          </h2>
          <Button 
            size="lg" 
            variant="secondary" 
            className="mobile-button lg:text-lg lg:px-8 bg-white text-primary hover:bg-white/90"
            onClick={handleGetStarted}
          >
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
}