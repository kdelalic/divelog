import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Layout from "./components/Layout";
import DiveLog from "./pages/DiveLog";
import AddDive from "./pages/AddDive";
import EditDive from "./pages/EditDive";
import Map from "./pages/Map";
import Settings from "./pages/Settings";
import './App.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <DiveLog />,
      },
      {
        path: "add",
        element: <AddDive />,
      },
      {
        path: "edit/:id",
        element: <EditDive />,
      },
      {
        path: "map",
        element: <Map />,
      },
      {
        path: "settings",
        element: <Settings />,
      }
    ],
  },
]);

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
