import { useNavigate, useParams } from 'react-router-dom';
import DiveForm from '@/components/DiveForm';
import type { Dive } from '@/lib/dives';
import useDiveStore from '@/store/diveStore';
import useSettingsStore from '@/store/settingsStore';

const EditDive = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dives = useDiveStore((state) => state.dives);
  const editDive = useDiveStore((state) => state.editDive);
  const isLoading = useDiveStore((state) => state.isLoading);
  const saveError = useDiveStore((state) => state.error);
  const settings = useSettingsStore((state) => state.settings);
  const diveToEdit = dives.find((dive) => dive.id === Number(id));

  if (!diveToEdit) {
    return <div>{isLoading ? 'Loading dive…' : 'Dive not found'}</div>;
  }

  const handleSubmit = async (dive: Omit<Dive, 'id'>) => {
    const saved = await editDive({ ...dive, id: diveToEdit.id });
    if (saved) navigate('/');
    return saved;
  };

  return (
    <DiveForm
      heading="Edit Dive"
      description="Update the details of your dive"
      submitLabel="Save Changes"
      settings={settings}
      initialDive={diveToEdit}
      isSubmitting={isLoading}
      saveError={saveError}
      onSubmit={handleSubmit}
    />
  );
};

export default EditDive;
