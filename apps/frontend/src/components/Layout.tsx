import { Outlet, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import useAuthStore from "../store/authStore";
import { Button } from "@/components/ui/button";

const Layout = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16 lg:h-18">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl lg:text-3xl font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
                Subsurface Web
              </Link>
            </div>
            <div className="flex space-x-6 lg:space-x-10">
              <Link 
                to="/" 
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors hover:bg-slate-100 text-base lg:text-lg cursor-pointer"
              >
                Dive Log
              </Link>
              <Link 
                to="/map" 
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors hover:bg-slate-100 text-base lg:text-lg cursor-pointer"
              >
                Map
              </Link>
              <Link 
                to="/dive-sites" 
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors hover:bg-slate-100 text-base lg:text-lg cursor-pointer"
              >
                Dive Sites
              </Link>
              <Link
                to="/settings"
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors hover:bg-slate-100 text-base lg:text-lg cursor-pointer"
              >
                Settings
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="hidden sm:inline text-sm text-slate-500">{user.username}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-600 hover:text-slate-900 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
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