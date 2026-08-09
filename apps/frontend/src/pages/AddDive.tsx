import { useNavigate } from 'react-router-dom';
import DiveForm from '@/components/DiveForm';
import type { Dive } from '@/lib/dives';
import useDiveStore from '@/store/diveStore';
import useSettingsStore from '@/store/settingsStore';

const AddDive = () => {
  const navigate = useNavigate();
  const addDive = useDiveStore((state) => state.addDive);
  const isSubmitting = useDiveStore((state) => state.isLoading);
  const saveError = useDiveStore((state) => state.error);
  const settings = useSettingsStore((state) => state.settings);

  const handleSubmit = async (dive: Omit<Dive, 'id'>) => {
    const saved = await addDive(dive);
    if (saved) navigate('/');
    return saved;
  };

  return (
    <DiveForm
      heading="Add New Dive"
      description="Record the details of your latest diving adventure"
      submitLabel="Save Dive"
      settings={settings}
      isSubmitting={isSubmitting}
      saveError={saveError}
      onSubmit={handleSubmit}
    />
  );
};

export default AddDive;
