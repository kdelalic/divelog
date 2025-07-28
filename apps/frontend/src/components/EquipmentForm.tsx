import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Equipment, Tank } from '@/lib/dives';
import { createGasMix, getGasMixColor } from '@/lib/dives';
import useSettingsStore from '@/store/settingsStore';
import { convertPressure, convertVolume, convertWeight } from '@/lib/unitConversions';

interface EquipmentFormProps {
  equipment?: Equipment;
  onChange: (equipment: Equipment) => void;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({ equipment, onChange }) => {
  const { settings } = useSettingsStore();
  // Convert equipment from database units (metric) to user's preferred units
  const convertEquipmentToUserUnits = (equip?: Equipment): Equipment => {
    if (!equip) {
      return {
        tanks: [],
        bcd: '',
        regulator: '',
        wetsuit: {
          type: 'wetsuit',
          thickness: undefined,
          material: ''
        },
        weights: undefined,
        fins: '',
        mask: '',
        computer: '',
        notes: ''
      };
    }

    return {
      ...equip,
      tanks: equip.tanks?.map(tank => ({
        ...tank,
        size: convertVolume(tank.size, 'liters', settings.units.volume),
        working_pressure: convertPressure(tank.working_pressure, 'bar', settings.units.pressure),
        start_pressure: convertPressure(tank.start_pressure, 'bar', settings.units.pressure),
        end_pressure: convertPressure(tank.end_pressure, 'bar', settings.units.pressure),
      })) || [],
      weights: equip.weights ? convertWeight(equip.weights, 'kilograms', settings.units.weight) : undefined,
    };
  };

  const [currentEquipment, setCurrentEquipment] = useState<Equipment>(
    convertEquipmentToUserUnits(equipment)
  );

  // Convert equipment from user units back to database units (metric)
  const convertEquipmentToMetricUnits = (equip: Equipment): Equipment => {
    return {
      ...equip,
      tanks: equip.tanks?.map(tank => ({
        ...tank,
        size: convertVolume(tank.size, settings.units.volume, 'liters'),
        working_pressure: convertPressure(tank.working_pressure, settings.units.pressure, 'bar'),
        start_pressure: convertPressure(tank.start_pressure, settings.units.pressure, 'bar'),
        end_pressure: convertPressure(tank.end_pressure, settings.units.pressure, 'bar'),
      })) || [],
      weights: equip.weights ? convertWeight(equip.weights, settings.units.weight, 'kilograms') : undefined,
    };
  };

  const updateEquipment = (updates: Partial<Equipment>) => {
    const newEquipment = { ...currentEquipment, ...updates };
    setCurrentEquipment(newEquipment);
    // Convert to metric units before sending to parent
    onChange(convertEquipmentToMetricUnits(newEquipment));
  };

  const addTank = () => {
    // Convert default values from metric to user's preferred units
    const defaultSize = convertVolume(12, 'liters', settings.units.volume); // 12L tank
    const defaultWorkingPressure = convertPressure(232, 'bar', settings.units.pressure); // 232 bar
    const defaultStartPressure = convertPressure(200, 'bar', settings.units.pressure); // 200 bar  
    const defaultEndPressure = convertPressure(50, 'bar', settings.units.pressure); // 50 bar
    
    const newTank: Tank = {
      name: `Tank ${currentEquipment.tanks.length + 1}`,
      size: defaultSize,
      working_pressure: defaultWorkingPressure,
      start_pressure: defaultStartPressure,
      end_pressure: defaultEndPressure,
      gas_mix: createGasMix(21), // Air
      material: 'steel'
    };
    updateEquipment({
      tanks: [...currentEquipment.tanks, newTank]
    });
  };

  const updateTank = (index: number, updates: Partial<Tank>) => {
    const newTanks = [...currentEquipment.tanks];
    newTanks[index] = { ...newTanks[index], ...updates };
    updateEquipment({ tanks: newTanks });
  };

  const removeTank = (index: number) => {
    const newTanks = currentEquipment.tanks.filter((_, i) => i !== index);
    updateEquipment({ tanks: newTanks });
  };

  const updateGasMix = (tankIndex: number, oxygen: number, helium = 0) => {
    const gasMix = createGasMix(oxygen, helium);
    updateTank(tankIndex, { gas_mix: gasMix });
  };

  return (
    <div className="space-y-6">
      {/* Tank Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Tank Configuration</CardTitle>
          <Button onClick={addTank} type="button" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Tank
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentEquipment.tanks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tanks configured</p>
              <p className="text-sm">Click "Add Tank" to add your first tank</p>
            </div>
          ) : (
            currentEquipment.tanks.map((tank, index) => (
              <Card key={index} className="border-l-4" style={{ borderLeftColor: getGasMixColor(tank.gas_mix) }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <h4 className="font-medium">Tank {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => removeTank(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-name`}>Tank Name</Label>
                    <Input
                      id={`tank-${index}-name`}
                      value={tank.name || ''}
                      onChange={(e) => updateTank(index, { name: e.target.value })}
                      placeholder="Main Tank"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-size`}>
                      Size ({settings.units.volume === 'liters' ? 'L' : 'ft³'})
                    </Label>
                    <Input
                      id={`tank-${index}-size`}
                      type="number"
                      step="0.1"
                      value={tank.size}
                      onChange={(e) => updateTank(index, { size: parseFloat(e.target.value) || 0 })}
                      min="1"
                      max={settings.units.volume === 'liters' ? "50" : "1.8"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-material`}>Material</Label>
                    <Select
                      value={tank.material || 'steel'}
                      onValueChange={(value: string) => updateTank(index, { material: value as 'steel' | 'aluminum' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steel">Steel</SelectItem>
                        <SelectItem value="aluminum">Aluminum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-working-pressure`}>
                      Working Pressure ({settings.units.pressure})
                    </Label>
                    <Input
                      id={`tank-${index}-working-pressure`}
                      type="number"
                      step={settings.units.pressure === 'bar' ? "1" : "50"}
                      value={tank.working_pressure}
                      onChange={(e) => updateTank(index, { working_pressure: parseFloat(e.target.value) || 0 })}
                      min={settings.units.pressure === 'bar' ? "100" : "1450"}
                      max={settings.units.pressure === 'bar' ? "350" : "5100"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-start-pressure`}>
                      Start Pressure ({settings.units.pressure})
                    </Label>
                    <Input
                      id={`tank-${index}-start-pressure`}
                      type="number"
                      step={settings.units.pressure === 'bar' ? "1" : "50"}
                      value={tank.start_pressure}
                      onChange={(e) => updateTank(index, { start_pressure: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={settings.units.pressure === 'bar' ? "350" : "5100"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-end-pressure`}>
                      End Pressure ({settings.units.pressure})
                    </Label>
                    <Input
                      id={`tank-${index}-end-pressure`}
                      type="number"
                      step={settings.units.pressure === 'bar' ? "1" : "50"}
                      value={tank.end_pressure}
                      onChange={(e) => updateTank(index, { end_pressure: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={settings.units.pressure === 'bar' ? "350" : "5100"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-oxygen`}>Oxygen (%)</Label>
                    <Input
                      id={`tank-${index}-oxygen`}
                      type="number"
                      value={tank.gas_mix.oxygen}
                      onChange={(e) => updateGasMix(index, parseFloat(e.target.value) || 21, tank.gas_mix.helium || 0)}
                      min="16"
                      max="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tank-${index}-helium`}>Helium (%)</Label>
                    <Input
                      id={`tank-${index}-helium`}
                      type="number"
                      value={tank.gas_mix.helium || 0}
                      onChange={(e) => updateGasMix(index, tank.gas_mix.oxygen, parseFloat(e.target.value) || 0)}
                      min="0"
                      max="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gas Mix</Label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getGasMixColor(tank.gas_mix) }}
                      />
                      <span className="font-medium">{tank.gas_mix.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Other Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Other Equipment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bcd">BCD</Label>
            <Input
              id="bcd"
              value={currentEquipment.bcd || ''}
              onChange={(e) => updateEquipment({ bcd: e.target.value })}
              placeholder="Scubapro Hydros Pro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regulator">Regulator</Label>
            <Input
              id="regulator"
              value={currentEquipment.regulator || ''}
              onChange={(e) => updateEquipment({ regulator: e.target.value })}
              placeholder="Apeks XTX50/XTX40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wetsuit-type">Wetsuit Type</Label>
            <Select
              value={currentEquipment.wetsuit?.type || 'wetsuit'}
              onValueChange={(value: string) => updateEquipment({
                wetsuit: { ...currentEquipment.wetsuit, type: value as 'wetsuit' | 'drysuit' | 'shorty' | 'none' }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wetsuit">Wetsuit</SelectItem>
                <SelectItem value="drysuit">Drysuit</SelectItem>
                <SelectItem value="shorty">Shorty</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wetsuit-thickness">Wetsuit Thickness (mm)</Label>
            <Input
              id="wetsuit-thickness"
              type="number"
              value={currentEquipment.wetsuit?.thickness || ''}
              onChange={(e) => updateEquipment({
                wetsuit: { 
                  type: currentEquipment.wetsuit?.type || 'wetsuit',
                  ...currentEquipment.wetsuit, 
                  thickness: parseInt(e.target.value) || undefined 
                }
              })}
              min="0"
              max="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weights">
              Weight ({settings.units.weight === 'kilograms' ? 'kg' : 'lbs'})
            </Label>
            <Input
              id="weights"
              type="number"
              value={currentEquipment.weights || ''}
              onChange={(e) => updateEquipment({ weights: parseFloat(e.target.value) || undefined })}
              min="0"
              max={settings.units.weight === 'kilograms' ? "50" : "110"}
              step={settings.units.weight === 'kilograms' ? "0.5" : "1"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="computer">Dive Computer</Label>
            <Input
              id="computer"
              value={currentEquipment.computer || ''}
              onChange={(e) => updateEquipment({ computer: e.target.value })}
              placeholder="Shearwater Perdix AI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fins">Fins</Label>
            <Input
              id="fins"
              value={currentEquipment.fins || ''}
              onChange={(e) => updateEquipment({ fins: e.target.value })}
              placeholder="Scubapro Jet Fins"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mask">Mask</Label>
            <Input
              id="mask"
              value={currentEquipment.mask || ''}
              onChange={(e) => updateEquipment({ mask: e.target.value })}
              placeholder="Hollis M1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipment Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentEquipment.notes || ''}
            onChange={(e) => updateEquipment({ notes: e.target.value })}
            placeholder="Additional equipment notes, maintenance reminders, etc."
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentForm;