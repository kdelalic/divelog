import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { DiveSample } from '@/lib/dives';
import useSettingsStore from '@/store/settingsStore';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

interface DiveProfileProps {
  samples: DiveSample[];
  maxDepth: number;
  className?: string;
}

const DiveProfile: React.FC<DiveProfileProps> = ({ 
  samples, 
  maxDepth,
  className = '' 
}) => {
  const { settings } = useSettingsStore();
  const chartRef = useRef<ChartJS<'line'>>(null);

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartData = useMemo(() => {
    if (!samples || samples.length === 0) {
      return null;
    }

    // Convert time to minutes for display
    const timeLabels = samples.map(sample => Math.round(sample.time / 60));
    
    // Depth data (inverted for diving profile - depth increases downward)
    const depthData = samples.map(sample => {
      const depthInUserUnits = settings.units.depth === 'feet' 
        ? sample.depth * 3.28084 
        : sample.depth;
      return -depthInUserUnits; // Negative for inverted Y-axis
    });

    // Temperature data (if available) - interpolate sparse data to connect all points
    const temperatureData = new Array(samples.length).fill(null);
    
    // First, collect actual temperature readings with their converted values
    const tempReadings: { index: number; value: number }[] = [];
    samples.forEach((sample, index) => {
      if (sample.temperature !== undefined) {
        // Temperature in UDDF is often in Kelvin, convert to Celsius first
        let tempCelsius = sample.temperature;
        if (sample.temperature > 100) { // Assume Kelvin if > 100 (reasonable threshold)
          tempCelsius = sample.temperature - 273.15;
        }
        
        const convertedTemp = settings.units.temperature === 'fahrenheit' 
          ? (tempCelsius * 9/5) + 32 
          : tempCelsius;
        tempReadings.push({ index, value: convertedTemp });
      }
    });

    // Interpolate between temperature readings to create a continuous line
    if (tempReadings.length > 1) {
      for (let i = 0; i < tempReadings.length - 1; i++) {
        const currentReading = tempReadings[i];
        const nextReading = tempReadings[i + 1];
        
        // Set the actual reading
        temperatureData[currentReading.index] = currentReading.value;
        
        // Interpolate between this reading and the next
        const indexDiff = nextReading.index - currentReading.index;
        const tempDiff = nextReading.value - currentReading.value;
        
        for (let j = 1; j < indexDiff; j++) {
          const interpolationRatio = j / indexDiff;
          const interpolatedTemp = currentReading.value + (tempDiff * interpolationRatio);
          temperatureData[currentReading.index + j] = interpolatedTemp;
        }
      }
      
      // Set the last reading
      const lastReading = tempReadings[tempReadings.length - 1];
      temperatureData[lastReading.index] = lastReading.value;
    } else if (tempReadings.length === 1) {
      // Single temperature reading - just set that one point
      temperatureData[tempReadings[0].index] = tempReadings[0].value;
    }

    // Pressure data (if available) - sparse data aligned with time labels
    const pressureData = new Array(samples.length).fill(null);
    samples.forEach((sample, index) => {
      if (sample.pressure !== undefined) {
        pressureData[index] = settings.units.pressure === 'psi' 
          ? sample.pressure * 14.5038 
          : sample.pressure;
      }
    });

    const datasets = [
      {
        label: `Depth (${settings.units.depth})`,
        data: depthData,
        borderColor: 'rgb(59, 130, 246)', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.2,
        pointRadius: 1,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 3,
        yAxisID: 'depth',
      }
    ];

    // Add temperature dataset if available
    if (temperatureData.some(t => t !== null)) {
      datasets.push({
        label: `Temperature (${settings.units.temperature === 'celsius' ? '°C' : '°F'})`,
        data: temperatureData,
        borderColor: 'rgb(239, 68, 68)', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.3, // Smooth interpolation
        pointRadius: 1, // Smaller points since we have more data now
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        pointHoverBackgroundColor: 'rgb(239, 68, 68)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 3,
        yAxisID: 'temperature',
      });
    }

    // Add pressure dataset if available
    if (pressureData.some(p => p !== null)) {
      datasets.push({
        label: `Pressure (${settings.units.pressure})`,
        data: pressureData,
        borderColor: 'rgb(34, 197, 94)', // Green
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(34, 197, 94)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 3,
        yAxisID: 'pressure',
      });
    }

    return {
      labels: timeLabels,
      datasets,
    };
  }, [samples, settings]);

  const chartOptions = useMemo(() => {
    const maxDepthInUserUnits = settings.units.depth === 'feet' 
      ? maxDepth * 3.28084 
      : maxDepth;

    // Calculate temperature range for better scaling
    const hasTemperature = chartData?.datasets.some(d => d.yAxisID === 'temperature');
    const hasPressure = chartData?.datasets.some(d => d.yAxisID === 'pressure');
    
    let tempMin, tempMax;
    if (hasTemperature && samples) {
      const temps = samples
        .filter(s => s.temperature !== undefined)
        .map(s => {
          // Temperature in UDDF is often in Kelvin, convert to Celsius first
          let tempCelsius = s.temperature!;
          if (s.temperature! > 100) { // Assume Kelvin if > 100 (reasonable threshold)
            tempCelsius = s.temperature! - 273.15;
          }
          
          const temp = settings.units.temperature === 'fahrenheit' 
            ? (tempCelsius * 9/5) + 32 
            : tempCelsius;
          return temp;
        });
      
      if (temps.length > 0) {
        tempMin = Math.min(...temps) - 2; // Add 2 degree padding
        tempMax = Math.max(...temps) + 2;
      }
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Dive Profile - Use mouse wheel to zoom, drag to pan, double-click to reset',
          font: {
            size: 14,
            weight: 'normal' as const,
          },
        },
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title: (tooltipItems: TooltipItem<'line'>[]) => {
              const minutes = tooltipItems[0]?.label;
              const seconds = Math.round(Number(minutes) * 60);
              const mins = Math.floor(seconds / 60);
              const secs = seconds % 60;
              return `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
            },
            label: (context: TooltipItem<'line'>) => {
              const { dataset, parsed } = context;
              
              if (dataset.yAxisID === 'depth') {
                const depth = Math.abs(parsed.y);
                return `Depth: ${depth.toFixed(1)} ${settings.units.depth}`;
              } else if (dataset.yAxisID === 'temperature') {
                const unit = settings.units.temperature === 'celsius' ? '°C' : '°F';
                return `Temperature: ${parsed.y.toFixed(1)}${unit}`;
              } else if (dataset.yAxisID === 'pressure') {
                return `Pressure: ${parsed.y.toFixed(0)} ${settings.units.pressure}`;
              }
              
              return `${dataset.label}: ${parsed.y}`;
            },
            afterBody: (tooltipItems: TooltipItem<'line'>[]) => {
              const index = tooltipItems[0]?.dataIndex;
              if (index !== undefined && samples[index]) {
                const sample = samples[index];
                const info = [];
                
                // Add ascent/descent rate if we have previous point
                if (index > 0) {
                  const prevSample = samples[index - 1];
                  const depthDiff = sample.depth - prevSample.depth;
                  const timeDiff = (sample.time - prevSample.time) / 60; // minutes
                  const rate = Math.abs(depthDiff / timeDiff);
                  const direction = depthDiff > 0 ? 'Descending' : 'Ascending';
                  const unit = settings.units.depth === 'feet' ? 'ft/min' : 'm/min';
                  const displayRate = settings.units.depth === 'feet' ? rate * 3.28084 : rate;
                  
                  if (rate > 0.1) { // Only show if significant rate
                    info.push(`${direction}: ${displayRate.toFixed(1)} ${unit}`);
                  }
                }
                
                return info;
              }
              return [];
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true,
            },
            drag: {
              enabled: true,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            },
            mode: 'xy' as const,
          },
          pan: {
            enabled: true,
            mode: 'xy' as const,
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time (minutes)',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        depth: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: `Depth (${settings.units.depth})`,
          },
          min: -Math.ceil(maxDepthInUserUnits * 1.1), // Add 10% padding
          max: Math.ceil(maxDepthInUserUnits * 0.1), // Surface + 10% padding
          reverse: false, // We're using negative values, so don't reverse
          grid: {
            color: 'rgba(59, 130, 246, 0.2)',
          },
          ticks: {
            callback: function(value: number | string) {
              return Math.abs(Number(value)).toString(); // Show positive values
            },
          },
        },
        temperature: {
          type: 'linear' as const,
          display: hasTemperature,
          position: 'right' as const,
          title: {
            display: true,
            text: `Temperature (${settings.units.temperature === 'celsius' ? '°C' : '°F'})`,
          },
          min: tempMin,
          max: tempMax,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: 'rgb(239, 68, 68)',
          },
        },
        pressure: {
          type: 'linear' as const,
          display: hasPressure && !hasTemperature, // Only show pressure if no temperature
          position: 'right' as const,
          title: {
            display: true,
            text: `Pressure (${settings.units.pressure})`,
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: 'rgb(34, 197, 94)',
          },
        },
      },
    };
  }, [samples, settings, maxDepth, chartData]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No Profile Data</div>
          <div className="text-gray-400 text-sm">
            This dive doesn't contain detailed sample data for profile visualization.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={resetZoom}
          className="bg-white/90 hover:bg-white"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset Zoom
        </Button>
      </div>
      <div className="h-full">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default DiveProfile;