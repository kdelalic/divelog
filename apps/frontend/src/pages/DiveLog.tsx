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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 -mt-6 lg:-mt-8">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Dive Dashboard
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl">
                Track and analyze your diving adventures with comprehensive logging and insights
              </p>
            </div>
            <div className="flex lg:flex-shrink-0">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setShowImport(true)}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-base font-medium shadow-sm mr-6"
              >
                Import UDDF
              </Button>
              <Link to="/add">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 py-4 text-base font-medium shadow-lg hover:shadow-xl transition-all">
                  Add Dive
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <DashboardStats stats={stats} />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <DiveChart dives={dives} />
        </div>
        <div className="lg:col-span-2">
          <RecentDives dives={dives} />
        </div>
      </div>

      {/* Table Section */}
      <div id="table" className="bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-xl">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xl font-semibold text-slate-900">All Dives</h3>
          <p className="mt-1 text-sm text-slate-600">Complete history of your dive activities</p>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Date</th>
              <th scope="col" className="w-2/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Location</th>
              <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Depth ({settings.units.depth === 'meters' ? 'm' : 'ft'})
              </th>
              <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Duration</th>
              <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Buddy</th>
              <th scope="col" className="w-1/6 relative px-8 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {dives
              .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
              .map((dive) => (
              <tr 
                key={dive.id} 
                className="hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                onClick={() => handleRowClick(dive)}
              >
                <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base font-medium text-slate-900">
                  {formatDiveDateTime(dive.datetime, settings)}
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600 font-medium">{dive.location}</td>
                <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600 font-semibold text-blue-600">
                  {formatDepth(dive.depth, settings.units.depth, 0)}
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600">{dive.duration} min</td>
                <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600">{dive.buddy || '—'}</td>
                <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1"
                    >
                      <Link to={`/edit/${dive.id}`}>Edit</Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this dive?")) {
                          deleteDive(dive.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
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