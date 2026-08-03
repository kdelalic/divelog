package models

import (
	"divelog-backend/utils"
	"fmt"
)

const (
	maxDiveDepth       = 999.99
	maxDiveDuration    = 1440
	maxTextLength      = 10000
	maxEquipmentString = 255
)

// Validate applies API and database constraints to a dive request.
func (dr *DiveRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}

	utils.RequireString(errors, "datetime", dr.DateTime, 35)
	if dr.DateTime != "" {
		if _, err := utils.ParseDateTimeStrict(dr.DateTime); err != nil {
			errors.Add("datetime", "must be a valid ISO 8601 date or timestamp")
		}
	}
	utils.RequireString(errors, "location", dr.Location, 255)
	if dr.Depth <= 0 || dr.Depth > maxDiveDepth {
		errors.Add("depth", "must be greater than 0 and at most 999.99 meters")
	}
	utils.IntRange(errors, "duration", dr.Duration, 1, maxDiveDuration)
	utils.FloatRange(errors, "lat", dr.Lat, -90, 90)
	utils.FloatRange(errors, "lng", dr.Lng, -180, 180)
	utils.OptionalString(errors, "buddy", dr.Buddy, 255)
	utils.OptionalString(errors, "notes", dr.Notes, maxTextLength)
	optionalFloatRange(errors, "water_temperature", dr.WaterTemp, -273.15, 100)
	optionalIntRange(errors, "visibility", dr.Visibility, 0, 1000)
	utils.OptionalOneOf(errors, "dive_type", dr.DiveType,
		"recreational", "training", "technical", "work", "research")
	optionalIntRange(errors, "rating", dr.Rating, 1, 5)

	for i, sample := range dr.Samples {
		prefix := fmt.Sprintf("samples[%d]", i)
		if sample.Time < 0 {
			errors.Add(prefix+".time", "must be greater than or equal to 0")
		}
		utils.FloatRange(errors, prefix+".depth", sample.Depth, 0, maxDiveDepth)
		optionalFloatRange(errors, prefix+".temperature", sample.Temperature, -273.15, 100)
		optionalFloatRange(errors, prefix+".pressure", sample.Pressure, 0, 1000)
	}

	if dr.Equipment != nil {
		validateEquipment(errors, dr.Equipment)
	}
	if dr.Conditions != nil {
		validateConditions(errors, dr.Conditions)
	}
	for i, stop := range dr.SafetyStops {
		prefix := fmt.Sprintf("safety_stops[%d]", i)
		if stop.Depth <= 0 || stop.Depth > 100 {
			errors.Add(prefix+".depth", "must be greater than 0 and at most 100 meters")
		}
		utils.IntRange(errors, prefix+".duration", stop.Duration, 1, 180)
	}

	return errors
}

// Validate applies API and database constraints to a dive-site request.
func (dsr *DiveSiteRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	utils.RequireString(errors, "name", dsr.Name, 255)
	utils.FloatRange(errors, "latitude", dsr.Latitude, -90, 90)
	utils.FloatRange(errors, "longitude", dsr.Longitude, -180, 180)
	utils.OptionalString(errors, "description", dsr.Description, maxTextLength)
	return errors
}

// Validate applies the allowed settings values enforced by PostgreSQL.
func (sr *SettingsRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	utils.OneOf(errors, "unitPreference", sr.UnitPreference, "imperial", "metric", "customize")
	utils.OneOf(errors, "units.depth", sr.Units.Depth, "meters", "feet")
	utils.OneOf(errors, "units.temperature", sr.Units.Temperature, "celsius", "fahrenheit")
	utils.OneOf(errors, "units.distance", sr.Units.Distance, "kilometers", "miles")
	utils.OneOf(errors, "units.weight", sr.Units.Weight, "kilograms", "pounds")
	utils.OneOf(errors, "units.pressure", sr.Units.Pressure, "bar", "psi")
	utils.OneOf(errors, "units.volume", sr.Units.Volume, "liters", "cubic_feet")
	utils.OneOf(errors, "preferences.dateFormat", sr.Preferences.DateFormat, "ISO", "US", "EU")
	utils.OneOf(errors, "preferences.timeFormat", sr.Preferences.TimeFormat, "12h", "24h")
	utils.OneOf(errors, "preferences.defaultVisibility", sr.Preferences.DefaultVisibility, "private", "public")
	utils.RequireString(errors, "dive.defaultGasMix", sr.Dive.DefaultGasMix, 50)

	maxDepthWarning := 100
	if sr.Units.Depth == "feet" {
		maxDepthWarning = 330
	}
	utils.IntRange(errors, "dive.maxDepthWarning", sr.Dive.MaxDepthWarning, 1, maxDepthWarning)

	return errors
}

func validateEquipment(errors utils.ValidationErrors, equipment *Equipment) {
	utils.OptionalString(errors, "equipment.bcd", equipment.BCD, maxEquipmentString)
	utils.OptionalString(errors, "equipment.regulator", equipment.Regulator, maxEquipmentString)
	utils.OptionalString(errors, "equipment.fins", equipment.Fins, maxEquipmentString)
	utils.OptionalString(errors, "equipment.mask", equipment.Mask, maxEquipmentString)
	utils.OptionalString(errors, "equipment.computer", equipment.Computer, maxEquipmentString)
	utils.OptionalString(errors, "equipment.notes", equipment.Notes, maxTextLength)
	optionalFloatRange(errors, "equipment.weights", equipment.Weights, 0, 1000)

	if equipment.Wetsuit != nil {
		utils.OneOf(errors, "equipment.wetsuit.type", equipment.Wetsuit.Type,
			"wetsuit", "drysuit", "shorty", "none")
		optionalIntRange(errors, "equipment.wetsuit.thickness", equipment.Wetsuit.Thickness, 0, 20)
		utils.OptionalString(errors, "equipment.wetsuit.material", equipment.Wetsuit.Material, maxEquipmentString)
	}

	for i, tank := range equipment.Tanks {
		prefix := fmt.Sprintf("equipment.tanks[%d]", i)
		utils.OptionalString(errors, prefix+".name", tank.Name, maxEquipmentString)
		if tank.Size <= 0 || tank.Size > 1000 {
			errors.Add(prefix+".size", "must be greater than 0 and at most 1000 liters")
		}
		if tank.WorkingPressure <= 0 || tank.WorkingPressure > 1000 {
			errors.Add(prefix+".working_pressure", "must be greater than 0 and at most 1000 bar")
		}
		utils.FloatRange(errors, prefix+".start_pressure", tank.StartPressure, 0, 1000)
		utils.FloatRange(errors, prefix+".end_pressure", tank.EndPressure, 0, 1000)
		if tank.EndPressure > tank.StartPressure {
			errors.Add(prefix+".end_pressure", "must not exceed start_pressure")
		}
		utils.IntRange(errors, prefix+".gas_mix.oxygen", tank.GasMix.Oxygen, 1, 100)
		optionalIntRange(errors, prefix+".gas_mix.helium", tank.GasMix.Helium, 0, 100)
		optionalIntRange(errors, prefix+".gas_mix.nitrogen", tank.GasMix.Nitrogen, 0, 100)
		helium := 0
		if tank.GasMix.Helium != nil {
			helium = *tank.GasMix.Helium
		}
		if tank.GasMix.Oxygen+helium > 100 {
			errors.Add(prefix+".gas_mix", "oxygen and helium percentages must total at most 100")
		}
		utils.OptionalString(errors, prefix+".gas_mix.name", tank.GasMix.Name, 100)
		utils.OptionalOneOf(errors, prefix+".material", tank.Material, "steel", "aluminum")
	}
}

func validateConditions(errors utils.ValidationErrors, conditions *DiveConditions) {
	optionalFloatRange(errors, "conditions.water_temp_surface", conditions.WaterTempSurface, -273.15, 100)
	optionalFloatRange(errors, "conditions.water_temp_bottom", conditions.WaterTempBottom, -273.15, 100)
	optionalFloatRange(errors, "conditions.air_temp", conditions.AirTemp, -273.15, 100)
	optionalFloatRange(errors, "conditions.visibility", conditions.Visibility, 0, 1000)
	utils.OptionalOneOf(errors, "conditions.current_strength", conditions.CurrentStrength,
		"none", "light", "moderate", "strong")
	utils.OptionalString(errors, "conditions.current_direction", conditions.CurrentDirection, 100)
	utils.OptionalOneOf(errors, "conditions.weather", conditions.Weather,
		"sunny", "cloudy", "overcast", "rainy", "windy")
	optionalIntRange(errors, "conditions.sea_state", conditions.SeaState, 0, 9)
	utils.OptionalOneOf(errors, "conditions.surge", conditions.Surge,
		"none", "light", "moderate", "heavy")
}

func optionalFloatRange(errors utils.ValidationErrors, field string, value *float64, minimum, maximum float64) {
	if value != nil {
		utils.FloatRange(errors, field, *value, minimum, maximum)
	}
}

func optionalIntRange(errors utils.ValidationErrors, field string, value *int, minimum, maximum int) {
	if value != nil {
		utils.IntRange(errors, field, *value, minimum, maximum)
	}
}
