import { useNavigate } from "react-router-dom";
import useDiveStore from "../store/diveStore";
import DiveForm from "@/components/DiveForm";
import type { DiveFormSubmitData } from "@/components/DiveForm";

const AddDive = () => {
  const navigate = useNavigate();
  const addDive = useDiveStore((state) => state.addDive);

  const handleSubmit = (data: DiveFormSubmitData) => {
    addDive(data);
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Add New Dive</h1>
        <p className="mt-2 text-lg lg:text-xl text-slate-600">Record the details of your latest diving adventure</p>
      </div>
      <DiveForm onSubmit={handleSubmit} submitLabel="Save Dive" />
    </div>
  );
};

export default AddDive;
