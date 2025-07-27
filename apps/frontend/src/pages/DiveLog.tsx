import { Link } from "react-router-dom";
import { useState } from "react";
import useDiveStore from "../store/diveStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DashboardStats from "@/components/DashboardStats";
import DiveChart from "@/components/DiveChart";
import RecentDives from "@/components/RecentDives";
import DiveDetailModal from "@/components/DiveDetailModal";
import UDDFImport from "@/components/UDDFImport";
import { calculateDiveStatistics } from "@/lib/diveStats";
import type { Dive } from "@/lib/dives";
import useSettingsStore from "@/store/settingsStore";
import { formatDepth } from "@/lib/unitConversions";
import { formatDiveDateTime } from "@/lib/dateHelpers";

const DiveLog = () => {
  const dives = useDiveStore((state) => state.dives);
  const deleteDive = useDiveStore((state) => state.deleteDive);
  const importDives = useDiveStore((state) => state.importDives);
  const { settings } = useSettingsStore();
  const stats = calculateDiveStatistics(dives);
  const [selectedDive, setSelectedDive] = useState<Dive | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);


  const handleRowClick = (dive: Dive) => {
    setSelectedDive(dive);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDive(null);
  };

  const handleImportDives = (importedDives: Dive[]) => {
    importDives(importedDives);
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dive Dashboard</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowImport(true);
            }}
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Import UDDF
          </Button>
          <Link to="/add">
            <Button>Add Dive</Button>
          </Link>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <DiveChart dives={dives} />
        <RecentDives dives={dives} />
      </div>

      <div id="table" className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Dives</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Depth ({settings.units.depth === 'meters' ? 'm' : 'ft'})
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buddy</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dives
              .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
              .map((dive) => (
              <tr 
                key={dive.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(dive)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDiveDateTime(dive.datetime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dive.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDepth(dive.depth, settings.units.depth, 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dive.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dive.buddy || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <Button 
                    variant="link" 
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link to={`/edit/${dive.id}`}>Edit</Link>
                  </Button>
                  <Button 
                    variant="link" 
                    className="text-red-600 hover:text-red-900" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this dive?")) {
                        deleteDive(dive.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DiveDetailModal 
        dive={selectedDive}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* UDDF Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Dive Data</DialogTitle>
          </DialogHeader>
          <UDDFImport onImport={handleImportDives} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiveLog; 