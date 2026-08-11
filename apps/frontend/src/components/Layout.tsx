import { Outlet, Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

const Layout = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16 lg:h-18">
            <div className="flex-shrink-0">
              <Link to="/" className="cursor-pointer text-2xl font-bold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 lg:text-3xl">
                Subsurface Web
              </Link>
            </div>
            <div className="flex items-center gap-1 lg:gap-3">
              <Link 
                to="/" 
                className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:text-lg"
              >
                Dive Log
              </Link>
              <Link 
                to="/map" 
                className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:text-lg"
              >
                Map
              </Link>
              <Link 
                to="/dive-sites" 
                className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:text-lg"
              >
                Dive Sites
              </Link>
              <Link 
                to="/settings" 
                className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:text-lg"
              >
                Settings
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
