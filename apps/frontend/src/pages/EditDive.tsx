import { useNavigate, useParams } from "react-router-dom";
import useDiveStore from "../store/diveStore";
import DiveForm from "@/components/DiveForm";
import type { DiveFormSubmitData } from "@/components/DiveForm";

const EditDive = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dives, editDive } = useDiveStore();
  const diveToEdit = dives.find((d) => d.id === Number(id));

  if (!diveToEdit) {
    return <div>Dive not found</div>;
  }

  const handleSubmit = (data: DiveFormSubmitData) => {
    editDive({
      ...data,
      id: diveToEdit.id,
      samples: diveToEdit.samples,
    });
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Edit Dive</h1>
        <p className="mt-2 text-lg lg:text-xl text-slate-600">Update the details of your dive</p>
      </div>
      <DiveForm initialDive={diveToEdit} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
};

export default EditDive;
