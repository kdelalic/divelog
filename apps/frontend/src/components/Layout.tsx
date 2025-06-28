import { Outlet, Link } from "react-router-dom";

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold">Subsurface Web</Link>
            </div>
            <div className="flex space-x-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">Dive Log</Link>
              <Link to="/map" className="text-gray-500 hover:text-gray-700">Map</Link>
              <Link to="/settings" className="text-gray-500 hover:text-gray-700">Settings</Link>
            </div>
          </div>
        </nav>
      </header>
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout; 